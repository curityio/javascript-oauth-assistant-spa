/*
 * Copyright (C) 2020 Curity AB. All rights reserved.
 *
 * The contents of this file are the property of Curity AB.
 * You may not copy or use this file, in either source code
 * or executable form, except in compliance with terms
 * set by Curity AB.
 *
 * For further information, please contact Curity AB.
 */

import Assistant, { getMandatory } from '@curity/oauth-assistant';

import './css/style.css';

const loginFlowRedirectButton = document.querySelector("#loginFlowRedirect");
const loginFlowRedirectMessage = document.querySelector("#loginMsgRedirect");
const loginFlowButton = document.querySelector("#loginFlow");
const loginFlowMessage = document.querySelector("#loginMsg");
const loginFlowHiddenButton = document.querySelector("#loginFlowHidden");
const loginFlowHiddenMsg = document.querySelector("#loginMsgHidden");

const revokeButton = document.querySelector("#revoke");
const revokeMsg = document.querySelector("#revokeMsg");

const refreshButton = document.querySelector("#refresh");
const refreshMsg = document.querySelector("#refreshMsg");

const showTokenButton = document.querySelector("#showToken");
const showTokenView = document.querySelector("#showTokenData");
const showRefreshTokenButton = document.querySelector("#showRefreshToken");
const showRefreshTokenView = document.querySelector("#showRefreshTokenData");
const showScopeView = document.querySelector("#showScopeData");
const showIDTokenButton = document.querySelector("#showIDToken");
const showIDTokenView = document.querySelector("#showIDTokenData");

const showExpiresInButton = document.querySelector("#showExpiresIn");
const showExpiresInView = document.querySelector("#showExpiresInData");
const showAdditionalFieldsButton = document.querySelector("#showAdditionalFields");
const showAdditionalFieldsView = document.querySelector("#showAdditionalFieldsData");

/** @type HTMLSelectElement */
const selectedFlow = document.querySelector("#authorizeFlow");

/** @type HTMLInputElement */
const authorizeSettingsInput = document.querySelector("#authorizeSettings");

/** @type HTMLInputElement */
const authorizeParamsInput = document.querySelector("#authorizeParameters");

const logoutButton = document.querySelector("#logoutButton");
const logoutMsg = document.querySelector("#logoutMsg");

/** @type HTMLInputElement */
const postLogoutRedirectUri = document.querySelector("#postLogoutRedirectUri");

const redirectUriForRedirect = window.origin + "/";
const redirectUriForIframe = window.origin + "/assisted.html";

const checkSessionIframeEvents = {
    onStateChanging: () => {
        console.log("on state changing callback");
    },
    onStateChanged : () => {
        console.log("on state changed callback");
    },
    onLogout       : (data) => {
        console.log('on logout callback : ', data);
    },
    onConsent      : (data) => {
        console.log('on consent required callback : ', data);
    },
    onError        : (data) => {
        console.log('on session error callback : ', data);
    },
    onUnchanged    : () => {
        console.log("on state unchanged callback");
    },
}

/** @type Assistant.Settings */
const authorizeSettings = {
    base_url                : "https://localhost:8443",
    client_id               : "oauth-assistant-client",
    // issuer         : "https://localhost:8443/oauth/v2/oauth-anonymous",
    issuer                  : "https://localhost:8443/dev/oauth/anonymous",
    redirect_uri            : window.origin + "/assisted.html",
    for_origin              : window.origin,
    flow_type               : "code",
    iframe                  : {
        targetElement: 'body',
        width        : null, // take default value
        height       : null, // take default value
        backdrop     : {
            visible      : true, // default is true
            style        : null, // take default value
            backdropClass: "backdrop-class"
        }
    },
    allowed_origins: ["https://localhost:8443", "http://localhost:8080"], // default is [window.origin]
    check_session_iframe    : null,
    session_polling_interval: 5, // polling interval in seconds, default is 5
    allowed_jwt_algorithms  : ['RS256'],
    jwt_sig_public_key      : { // allowed formats are jwk | jwks_uri | pem | issuer | metadata_url | raw
        format: 'issuer', // in case of issuer, the issuer value will be taken from jwt payload
        value : null
    },
    debug                   : false,
    // openid_configuration_url: "" // Set if the OpenID Configuration URL uses different host or base path than the issuer
    //check_session_iframe_events: checkSessionIframeEvents
};

selectedFlow.value = window.location.hash ? 'implicit' : 'code';

let isEventListenersAdded = false;

/** @type Assistant */
let assistant;

function init(settings) {
    settings.flow_type = selectedFlow.value;
    if (settings.flow_type === "code") {
        settings.redirect_uri = redirectUriForRedirect;
    }
    authorizeSettingsInput.value = JSON.stringify(settings, undefined, 4);

    if (!isEventListenersAdded) {
        isEventListenersAdded = true;
        addEventListeners();
    }

    assistant = new Assistant({
        ...settings,
        check_session_iframe_events: checkSessionIframeEvents
    });

    assistant.init()
        .then(() => {
            console.log("assistant loaded");
        });
}

function addEventListeners() {

    loginFlowRedirectButton.addEventListener('click', (evt) => {
        console.log("Login with redirect");

        assistantForRedirect().then(() => assistant.authorize(JSON.parse(authorizeParamsInput.value)));
    });

    loginFlowButton.addEventListener('click', (evt) => {
        console.log("Start Login Visible Frame");

        assistantForIframe().then(() => assistant.authorizeFrame(JSON.parse(authorizeParamsInput.value))
            .then((token) => {
                console.log("Got token: " + token);
                loginFlowMessage.innerHTML = "Token " + token;
            })
            .catch((err) => {
                loginFlowMessage.innerHTML = getFormattedError(err);
            })
        );
    });

    loginFlowHiddenButton.addEventListener('click', (evt) => {
        console.log("Start Login hidden = true");

        assistantForIframe().then(() => assistant.authorizeHiddenFallbackToVisible(JSON.parse(authorizeParamsInput.value))
            .then((token) => {
                console.log("Got token: " + token);
                loginFlowHiddenMsg.innerHTML = "Token: " + token;
            })
            .catch((err) => {
                if (err.error === "login_required") {
                    loginFlowHiddenMsg.innerHTML = "Login Required";
                } else {
                    loginFlowHiddenMsg.innerHTML = getFormattedError(err);
                }
            })
        );
    });

    revokeButton.addEventListener('click', (evt) => {
        console.log("Start Revoke");
        assistant.revoke()
            .then(() => {
                console.log("Revoke OK");
                revokeMsg.innerHTML = "";
            })
            .catch((err) => {
                revokeMsg.innerHTML = getFormattedError(err);
            });
    });

    refreshButton.addEventListener('click', (evt) => {
        console.log("Start Refresh");
        assistant.refresh()
            .then(() => {
                console.log("Refresh OK");
                refreshMsg.innerHTML = "";
                showRefreshTokenView.innerHTML = assistant.getRefreshToken();
                showTokenView.innerHTML = assistant.getToken();
            })
            .catch((err) => {
                refreshMsg.innerHTML = getFormattedError(err);
            });
    });

    showTokenButton.addEventListener('click', (evt) => {
        const token = assistant.getToken();
        const scope = assistant.getScope();
        if (token === null) {
            showTokenView.innerHTML = "No Token";
            showScopeView.innerHTML = "";
        } else {
            showTokenView.innerHTML = token;
            showScopeView.innerHTML = scope;
        }
    });

    showExpiresInButton.addEventListener('click', (evt) => {
        const expiresIn = assistant.getExpiresIn();
        if (expiresIn === null) {
            showExpiresInView.innerHTML = "No Expires In";
        } else {
            showExpiresInView.innerHTML = expiresIn;
        }
    });

    showAdditionalFieldsButton.addEventListener('click', (evt) => {
        const additionalFields = assistant.getAdditionalFields();
        if (additionalFields === null) {
            showAdditionalFieldsView.innerHTML = "No Additional Fields";
        } else {
            showAdditionalFieldsView.innerHTML = JSON.stringify(additionalFields);
        }
    });

    showIDTokenButton.addEventListener('click', (evt) => {
        const idToken = assistant.getIDToken();
        if (idToken === null) {
            showIDTokenView.innerHTML = "No ID Token";
        } else {
            showIDTokenView.innerHTML = idToken;
        }
    });

    showRefreshTokenButton.addEventListener('click', (evt) => {
        const refreshToken = assistant.getRefreshToken();
        if (refreshToken === null) {
            showRefreshTokenView.innerHTML = "No Token";
        } else {
            showRefreshTokenView.innerHTML = refreshToken;
        }
    });

    postLogoutRedirectUri.value = window.origin + "/assisted.html";
    logoutButton.addEventListener('click', () => {
        logoutMsg.innerHTML = "";
        assistant.logout(postLogoutRedirectUri.value)
            .then(() => {
                logoutMsg.innerHTML = "Logged out successfully";
            })
            .catch((err) => {
                logoutMsg.innerHTML = "Failed to logout";
            });
    });
}

function getFormattedError(errorResponse) {
    console.error(errorResponse);
    // err object contains `err.error` and `err.error_description`;
    return JSON.stringify(errorResponse, undefined, 4);
}

function initAssistantWithRedirectUri(redirectUri) {
    const settings = JSON.parse(authorizeSettingsInput.value);
    settings.redirect_uri = redirectUri;

    assistant = new Assistant({
        ...settings,
        check_session_iframe_events: checkSessionIframeEvents
    });

    return assistant.init();
}

function assistantForIframe() {
    return initAssistantWithRedirectUri(redirectUriForIframe);
}

function assistantForRedirect() {
    return initAssistantWithRedirectUri(redirectUriForRedirect);
}

init(authorizeSettings);
selectedFlow.addEventListener("change", () => {
    init(JSON.parse(authorizeSettingsInput.value));
});

authorizeSettingsInput.addEventListener("change", () => {
    init(JSON.parse(authorizeSettingsInput.value));
});
