// アプリケーション層：外部ホスティングするフロントエンド（GAS以外）から呼び出すJSON API。
// GAS Webアプリの/exec URLは元々Googleアカウントログインで保護されていたが、フロントエンドを
// 外部ホスティングしdoPost経由でHTTP直接呼び出しにすると、この保護がなくなる。代わりに簡易パスワード
// ログイン＋トークン方式で保護する（店舗規模のため、店主のみが知るパスワード1つで十分と判断）
//
// フロントエンドはPOSTで {action, token, args} をJSON文字列として送る（Content-Typeは
// text/plainにすること。application/jsonにするとブラウザがCORSプリフライト(OPTIONS)を送るが、
// GAS Webアプリはプリフライトに正しく応答できないため）。ログインのみtoken不要（{action:'login', password}）

var API_PASSWORD_PROPERTY_ = 'API_PASSWORD';
var API_TOKENS_PROPERTY_ = 'API_TOKENS';
var API_TOKEN_TTL_MS_ = 30 * 24 * 60 * 60 * 1000; // 30日
var API_LOGIN_FAILS_PROPERTY_ = 'API_LOGIN_FAILS';
var API_LOGIN_MAX_ATTEMPTS_ = 5;
var API_LOGIN_LOCKOUT_MS_ = 5 * 60 * 1000; // 5分

// クライアント（ブラウザ）から呼び出せる関数のみ許可する（許可リスト方式）。
// setupDatabase・doGet・include等の管理用/内部関数は含めない
var API_ALLOWED_ACTIONS_ = [
  'closeRegister', 'createSubCategory', 'deactivateMenu',
  'deleteExpenseEntry', 'deleteMenu', 'deleteSalesEntry', 'deleteSubCategory',
  'generatePrintMenuText',
  'getAbcAnalysisData', 'getBudgetData', 'getBudgetDataForYear', 'getCashRegisterData', 'getCategoryList', 'getCustomerList',
  'getCustomerOrderRanking', 'getDailyTargetsForMonth', 'getDashboardData', 'getDayAnalysisData',
  'getExpenseCategoryList', 'getExpenseManagementData', 'getExpenseYearlyData',
  'getMenuList', 'getMenuManagementData', 'getProductAnalysisData', 'getProfitLossData', 'getSalesEntryData', 'getSalesStatsData', 'getSeatList',
  'getSegmentAnalysisData', 'getSubCategoryList', 'getWeatherAnalysisData', 'moveSubCategory',
  'reactivateMenu',
  'registerCustomer', 'renameCategory', 'renameSubCategory',
  'reorderMenus', 'reorderSubCategories',
  'saveBudgetTarget', 'saveBudgetTargetsForYear',
  'saveBusinessDayWeather', 'saveBusinessDayWeatherAndGetData', 'saveCustomerDetail', 'saveDailyTargetsForMonth',
  'saveExpenseCategoryEdits', 'saveExpenseEntry',
  'saveMenu', 'saveSalesEntry', 'saveStartingCash', 'setMenuOnPrintMenu',
  'toggleSeatActive', 'updateMenuPrintText'
];

// Apps Scriptエディタから手動で一度だけ実行し、ログイン用パスワードを設定する
// （setupDatabase()と同じ運用：コードに書かず、実行者が都度決めた値をスクリプトプロパティに保存する）
function setApiPassword(password) {
  if (!password) {
    throw new Error('パスワードを指定してください（例：setApiPassword("好きな文字列")）');
  }
  PropertiesService.getScriptProperties().setProperty(API_PASSWORD_PROPERTY_, password);
  Logger.log('パスワードを設定しました');
}

function doPost(e) {
  var response;
  try {
    response = handleApiRequest_(e);
  } catch (error) {
    response = { error: error.message };
  }
  return ContentService.createTextOutput(JSON.stringify(response))
    .setMimeType(ContentService.MimeType.JSON);
}

function handleApiRequest_(e) {
  var body = e && e.postData && e.postData.contents ? JSON.parse(e.postData.contents) : {};
  var action = body.action;

  if (action === 'login') {
    return { token: login_(body.password) };
  }

  if (!isValidToken_(body.token)) {
    throw new Error('認証が切れています。再度ログインしてください');
  }
  if (API_ALLOWED_ACTIONS_.indexOf(action) === -1) {
    throw new Error('不正な操作です：' + action);
  }

  var args = body.args || [];
  var result = this[action].apply(null, args);
  return { result: result === undefined ? null : result };
}

// 総当たり攻撃対策：連続で規定回数失敗すると一定時間ログインを受け付けない（IPごとではなく
// 全体で1つのカウンタ。Apps ScriptのWebアプリイベントからは呼び出し元IPを取得できないため）。
// 正規ユーザーがパスワードを度忘れして連続失敗した場合も一時的にロックされるが、店舗規模の
// 利用頻度・スクリプトプロパティの読み書きコストを踏まえ、この簡易な方式で十分と判断
function login_(password) {
  return LockUtil.withLock(function () {
    checkLoginLockout_();

    var correctPassword = PropertiesService.getScriptProperties().getProperty(API_PASSWORD_PROPERTY_);
    if (!correctPassword) {
      throw new Error('パスワードが未設定です。Apps ScriptエディタでsetApiPassword()を実行してください');
    }
    if (password !== correctPassword) {
      recordLoginFailure_();
      throw new Error('パスワードが違います');
    }

    clearLoginFailures_();
    var token = Utilities.getUuid();
    var tokens = loadApiTokens_();
    tokens[token] = Date.now() + API_TOKEN_TTL_MS_;
    saveApiTokens_(tokens);
    return token;
  });
}

function checkLoginLockout_() {
  var state = loadLoginFailState_();
  var remainingMs = state.lockUntil - Date.now();
  if (remainingMs > 0) {
    var remainingMin = Math.ceil(remainingMs / 60000);
    throw new Error('ログイン試行回数が上限を超えました。' + remainingMin + '分後に再度お試しください');
  }
}

function recordLoginFailure_() {
  var state = loadLoginFailState_();
  state.count = (state.lockUntil > Date.now() ? 0 : state.count) + 1;
  if (state.count >= API_LOGIN_MAX_ATTEMPTS_) {
    state.lockUntil = Date.now() + API_LOGIN_LOCKOUT_MS_;
    state.count = 0;
  }
  PropertiesService.getScriptProperties().setProperty(API_LOGIN_FAILS_PROPERTY_, JSON.stringify(state));
}

function clearLoginFailures_() {
  PropertiesService.getScriptProperties().deleteProperty(API_LOGIN_FAILS_PROPERTY_);
}

function loadLoginFailState_() {
  var raw = PropertiesService.getScriptProperties().getProperty(API_LOGIN_FAILS_PROPERTY_);
  return raw ? JSON.parse(raw) : { count: 0, lockUntil: 0 };
}

function isValidToken_(token) {
  if (!token) {
    return false;
  }
  var tokens = loadApiTokens_();
  var expiry = tokens[token];
  return !!expiry && expiry > Date.now();
}

function loadApiTokens_() {
  var raw = PropertiesService.getScriptProperties().getProperty(API_TOKENS_PROPERTY_);
  return raw ? JSON.parse(raw) : {};
}

// 保存のたびに期限切れのトークンを取り除く（スクリプトプロパティの容量を圧迫しないため）
function saveApiTokens_(tokens) {
  var now = Date.now();
  var cleaned = {};
  Object.keys(tokens).forEach(function (token) {
    if (tokens[token] > now) {
      cleaned[token] = tokens[token];
    }
  });
  PropertiesService.getScriptProperties().setProperty(API_TOKENS_PROPERTY_, JSON.stringify(cleaned));
}
