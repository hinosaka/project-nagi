// GASのdoPost JSON APIをfetchで呼び出すクライアント。
// 各画面のJS（menu.html等）はgoogle.script.run.withSuccessHandler(...).withFailureHandler(...).関数名(引数)
// という書式のまま変更せず動かしたいため、同じ形の呼び出しを受け付けるプロキシ（google.script.runの代替）を用意する。
// 呼び出し側コードは、実体がfetchベースのAPIクライアントに置き換わったことを意識しなくてよい。
(function () {
  var TOKEN_KEY = 'posApiToken';

  function getToken() {
    return localStorage.getItem(TOKEN_KEY);
  }

  function setToken(token) {
    localStorage.setItem(TOKEN_KEY, token);
  }

  function clearToken() {
    localStorage.removeItem(TOKEN_KEY);
  }

  // 読み取り専用（get〜）の関数のみ再試行してよいとみなす。この API は関数名を get〜 で
  // 始める命名規則を徹底している（Api.gsのAPI_ALLOWED_ACTIONS_参照）ため、これで安全に
  // 判定できる。書き込み系（save〜/delete〜/create〜等）は、リクエスト自体はサーバーに
  // 届いて処理済みなのに応答の受信だけ失敗した場合に再試行すると、会計の二重登録や
  // レジクローズの二重記録など、データ不整合につながるおそれがあるため再試行しない
  function isRetryableAction(action) {
    return action === 'login' || /^get/.test(action);
  }

  // Content-Typeをtext/plainにする（application/jsonだとブラウザがCORSプリフライト(OPTIONS)を
  // 送るが、GAS Webアプリはプリフライトに正しく応答できずエラーになるため）
  //
  // ブラウザ側のTypeError: Failed to fetch（ネットワーク層の一過性の失敗）に加えて、GASの
  // doPost実行結果への302リダイレクト先（script.googleusercontent.com/macros/echo）が
  // Google Drive側の一過性の不具合で「現在、ファイルを開くことができません」のようなHTMLを
  // 返すことがあり、その場合はJSONとして正しくparseできない。どちらも一過性の失敗として
  // 1回だけ再試行するが、書き込み系アクションは二重実行を避けるため再試行しない（上記参照）

  // 同一タブから複数の呼び出しが重なると（例：詳細ポップアップを開いた直後に別項目の自動保存が
  // 走る等）、GAS Webアプリ側は同一スクリプトへの同時実行をうまく捌けず、通常は数秒で終わる
  // 呼び出しが数十秒かかったり「Failed to fetch」になったりすることを2026-08-05に実機で確認した。
  // そのためリクエストはこのタブ内で常に1本ずつ順番に送る（前の呼び出しの完了＝成功/失敗を
  // 問わず待ってから次を送る）
  var requestQueue = Promise.resolve();

  function postJson(payload) {
    function attempt() {
      return doFetch().catch(function (error) {
        var isTransient = error instanceof TypeError || error.isInvalidJsonResponse;
        if (isTransient && isRetryableAction(payload.action)) {
          return doFetch();
        }
        throw error;
      });
    }

    var result = requestQueue.then(attempt, attempt);
    requestQueue = result.then(function () {}, function () {});
    return result;

    function doFetch() {
      return fetch(window.POS_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(payload)
      }).then(function (res) {
        return res.text();
      }).then(function (text) {
        try {
          return JSON.parse(text);
        } catch (e) {
          var error = new Error('サーバーから予期しない応答がありました（一時的な問題の可能性があります）');
          error.isInvalidJsonResponse = true;
          throw error;
        }
      });
    }
  }

  function login(password) {
    return postJson({ action: 'login', password: password }).then(function (body) {
      if (body.error) {
        throw new Error(body.error);
      }
      setToken(body.token);
    });
  }

  function logout() {
    clearToken();
    location.href = 'login.html';
  }

  // ログイン必須ページの先頭で呼ぶ。未ログインならログイン画面へ即リダイレクトする
  function requireAuth() {
    if (!getToken()) {
      location.href = 'login.html';
    }
  }

  function callAction(action, args) {
    return postJson({ action: action, token: getToken(), args: args }).then(function (body) {
      if (body.error) {
        var error = new Error(body.error);
        if (/認証が切れています/.test(body.error)) {
          clearToken();
          location.href = 'login.html';
        }
        throw error;
      }
      return body.result;
    });
  }

  // google.script.runと同じ書式（withSuccessHandler().withFailureHandler().関数名(引数)）で
  // 呼び出せるプロキシを毎回新規に作る（実物のgoogle.script.runも参照するたびに新しいランナーを返す）
  function createRunner() {
    var successHandler = null;
    var failureHandler = null;
    var base = {
      withSuccessHandler: function (fn) {
        successHandler = fn;
        return proxy;
      },
      withFailureHandler: function (fn) {
        failureHandler = fn;
        return proxy;
      },
      withUserObject: function () {
        return proxy;
      }
    };
    var proxy = new Proxy(base, {
      get: function (target, prop) {
        if (prop in target) {
          return target[prop];
        }
        return function () {
          var args = Array.prototype.slice.call(arguments);
          callAction(prop, args).then(function (result) {
            if (successHandler) {
              successHandler(result);
            }
          }).catch(function (error) {
            if (failureHandler) {
              failureHandler(error);
            } else {
              console.error(error);
            }
          });
        };
      }
    });
    return proxy;
  }

  window.google = window.google || {};
  window.google.script = window.google.script || {};
  Object.defineProperty(window.google.script, 'run', {
    get: createRunner
  });

  window.PosApi = {
    login: login,
    logout: logout,
    requireAuth: requireAuth,
    getToken: getToken
  };
})();
