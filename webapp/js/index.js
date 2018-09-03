requirejs(config.client.dependencies, function() {
    const baseurl = "http://127.0.0.1:8000";
    /**
     * storing references to DOM elements which might be used frequently
     */
    let $body       = $(`[data-id="applicationBody"]`);
    let $doLogin    = $(`[data-id="doLogin"]`);
    let $doRegister = $(`[data-id="doRegister"]`);

    let $notification   = $(`[data-id="notification"]`);
    let $allSharedNotes = $(`[data-id="allSharedNotes"]`);
    let $submitNewNote  = $(`[data-id="submitNewNote"]`);
    let $refreshNotes   = $(`[data-id="refreshSharedNotes"]`);

    /**
     * utility functions
     */
    function showNotification(notification) {
        alert(`${notification.type}\n${notification.message}`);
    }

    function renderPasswordInput() {
        $(`[data-id="loginContainerUsername"]`).addClass("hidden");
        $(`[data-id="loginContainerPassword"]`).removeClass("hidden");
    }

    function getSharedNotes() {
        let asnParams = {
            method: "POST",
            url: (baseurl + config.server.endpoints.all),
            caller: "allSharedNotes",
        }
        pingServer(asnParams);
    }

    function viewThisNote(noteUrl) {
        let vtnParams = {
            method: "POST",
            url: (baseurl + config.server.endpoints.view + "/" + noteUrl),
            caller: "viewNote",
        }
        pingServer(vtnParams);
    }

    function deleteThisNote(noteUrl) {
        let delParams = {
            data: { username: window.username, createKey: window.createKey,},
            method: "POST",
            url: (baseurl + config.server.endpoints.delete + "/" + noteUrl),
            caller: "deleteNote"
        }
        pingServer(delParams);
    }

    function renderCurrentNote(data) {
        let $element = $(`[data-id="viewArea"]`);

        $element.find(".view-note-title").html(data.title);
        $element.find(".view-note-author").html(data.author);
        $element.find(".view-note-created-on").html(data.createdOn);
        $element.find(".view-note-body").html(data.body);
        $element.find(".delete-note").attr("data-url", data.url);

        $element.find(".delete-note").on("click", function() {
            deleteThisNote($(this).attr("data-url"));
        });
    }

    function renderSharedNotes(data) {
        $allSharedNotes.html("");

        for(let note of data) {
            let sn = new SharedNotes(note.title, note.author, note.createdOn, note.url);
            $allSharedNotes.append(sn.renderSharedNoteUrl);
        }

        $allSharedNotes.find(`[data-id="noteUrl"]`).on("click", function() {
            var noteId = $(this).attr("data-url");
            viewThisNote(noteId);
        });

        !(void 0 === $allSharedNotes.find(`[data-id="noteUrl"]`)[0]) && $allSharedNotes.find(`[data-id="noteUrl"]`)[0].click();
    }

    /**
     * delegate function for listener: doLogin
     */
    function doLogin() {
        let username = $(`[data-id="username"]`).val();
        let password = $(`[data-id="password"]`).val();
        let authKey  = window.authKey;

        let loginParameters = {
            method: "POST",
            url: (baseurl + config.server.endpoints.login),
            data: { username, password, authKey, },
            caller: "doLogin",
        }

        pingServer(loginParameters);
    }
    $doLogin.on("click", function() {
        doLogin();
    });

    /**
     * delegate function for listener: doRegister
     */
    function doRegister() {
        let username = $(`[data-id="newUsername"]`).val();
        let password = $(`[data-id="newPassword"]`).val();
        let method   = "POST";
        let url      = baseurl + config.server.endpoints.register;

        let registrationParameters = {
            method,
            url,
            data: {
                username,
                password,
            },
            caller: "doRegister",
        }

        pingServer(registrationParameters);
    }
    $doRegister.on("click", function() {
        doRegister();
    });

    /**
     * delegate function for listener: submitNewNote
     */
    function submitNewNote() {
        let title = $(`[data-id="newNoteTitle"]`).val();
        let body = $(`[data-id="newNoteBody"]`).val();

        if(void 0 === title || void 0 === body || "" === title || "" === body) {
            alert("Title and Content are mandatory!");
        } else {
            let snnParams = {
                data: { title, body, username: window.username, createKey: window.createKey,},
                method: "POST",
                url: (baseurl + config.server.endpoints.create),
                caller: "createNewNote",
            }
            pingServer(snnParams);
        }
    }
    $submitNewNote.on("click", function() {
        submitNewNote();
        $submitNewNote.hide();
        setTimeout(function() {
            $submitNewNote.show();
        }, 1000);
    });

    $refreshNotes.on("click", function() {
        getSharedNotes();
    });

    /**
     * AJAX success handler
     * @param {*} data 
     */
    function successHandler(data) {
        if("doRegister" === window.caller) {
            showNotification(data);

        } else if("doLogin" === window.caller) {
            if(data.next) {
                renderPasswordInput();
                window.authKey = data.authKey;

            } else {
                if("success" === data.type) {
                    if(! $(`[data-id="applicationLogin"]`).hasClass("hidden")) {
                        $(`[data-id="applicationLogin"]`).addClass("hidden");
                        $(`[data-id="applicationDashboard"]`).removeClass("hidden");
                        getSharedNotes();
                        window.username = data.username;
                        window.createKey = data.createKey;
                    }
    
                } else if("error" === data.type) {
                    showNotification(data);
                }
            }            

        } else if("createNewNote" === window.caller) {
            showNotification(data);

        } else if("allSharedNotes" === window.caller) {
            renderSharedNotes(data);

        } else if("viewNote" === window.caller) {
            renderCurrentNote(data);

        } else if("deleteNote" === window.caller) {
            showNotification(data);

        } else {
            console.log("something is wrong!");
        }
    }

    /**
     * AJAX error handler
     */
    function errorHandler() {
        alert("something went wrong at server");
    }

    /**
     * generic funciton to ping remote server and receive response
     * @param {*} params 
     */
    function pingServer(params) {
        window.caller = params.caller;
        let ajaxParam = {
            method  : params.method,
            url     : params.url,
            data    : params.data,
            type    : "application/json",
            success : successHandler,
            error   : errorHandler,
            cache   : false,
        }
        console.log(ajaxParam);

        $.ajax(ajaxParam);
        delete window.authKey;
        $(`[data-id="newPassword"]`).val(undefined);
    }
});