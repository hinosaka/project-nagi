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

// クライアント（ブラウザ）から呼び出せる関数のみ許可する（許可リスト方式）。
// setupDatabase・doGet・include等の管理用/内部関数は含めない
var API_ALLOWED_ACTIONS_ = [
  'closeRegister', 'createCategory', 'createSubCategory', 'deactivateMenu', 'deleteSalesEntry',
  'getAbcAnalysisData', 'getBudgetData', 'getBudgetDataForYear', 'getCashRegisterData', 'getCategoryList', 'getCustomerList',
  'getCustomerOrderRanking', 'getDailyTargetsForMonth', 'getDashboardData', 'getDayAnalysisData',
  'getMenuList', 'getMenuManagementData', 'getProductAnalysisData', 'getSalesEntryData', 'getSalesStatsData', 'getSeatList',
  'getSegmentAnalysisData', 'getSubCategoryList', 'getWeatherAnalysisData', 'moveSubCategory', 'reactivateMenu',
  'registerCustomer', 'renameCategory', 'renameSubCategory', 'saveBudgetTarget', 'saveBudgetTargetsForYear',
  'saveBusinessDayWeather', 'saveBusinessDayWeatherAndGetData', 'saveCustomerDetail', 'saveDailyTargetsForMonth',
  'saveMenu', 'saveSalesEntry', 'saveStartingCash', 'toggleSeatActive'
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

function login_(password) {
  var correctPassword = PropertiesService.getScriptProperties().getProperty(API_PASSWORD_PROPERTY_);
  if (!correctPassword) {
    throw new Error('パスワードが未設定です。Apps ScriptエディタでsetApiPassword()を実行してください');
  }
  if (password !== correctPassword) {
    throw new Error('パスワードが違います');
  }
  var token = Utilities.getUuid();
  var tokens = loadApiTokens_();
  tokens[token] = Date.now() + API_TOKEN_TTL_MS_;
  saveApiTokens_(tokens);
  return token;
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
