/**
 * dependencies
 */
var express = require('express');
var qs = require('querystring');
var mysql = require('mysql');
var config = require('./server-config');

/**
 * initialization
 */
var app = express();
var storage = {};
var createKeyMap = {};
var useridMap = {};

/**
 * database connection pooling
 */
var dbOptions = {
    host:      config.database.host,
    user:       config.database.user,
    password: config.database.password,
    port:       config.database.port, 
    database: config.database.db
};
var connectionPool  = mysql.createPool(dbOptions);

/**
 * setting appropriate headers
 */
app.use(function (req, res, next) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');
    res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,content-type');
    res.setHeader('Access-Control-Allow-Credentials', true);
    next();
});

/**
 * constants declaration
 */
const aplhabetString   = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const numberString     = "0123456789";

/**
 * UTILITY FUNCTIONS
 */

function generateSecondaryAuthenticationKey() {
    let authKey = "";
    for(let i=0; i<6; i++) {
        authKey += aplhabetString.charAt(Math.floor([Math.random()*26]));
    }
    for(let i=0; i<4; i++) {
        authKey += numberString.charAt(Math.floor([Math.random()*10]));
    }
    return authKey;
}


function getPostBody(req, res, pushThrough) {
    if(req.method === "POST") {
        var body = '';
    
        req.on('data', function (data) {
            body += data;
        });

        req.on('end', function () {
            let data = qs.parse(body);
            pushThrough(req, res, data);
        });
    }
}

function authenticate(res, username, password) {
    let alert = {
        type: "",
        message: "",
    }
    connectionPool.getConnection(function(err, con) {
        if(err) {
            alert.type = "error";
            alert.message = "error in getting connection from connection pool";
            con.release();
            res.send(alert);
        } else {
            let existsUserQuery = `select userid from userinfo where username = "${username}" and userkey = "${password}"`;
            con.query(existsUserQuery, function(error, results, fields){
                if(error) {
                    alert.type = "error";
                    alert.message = "error in reading credentials";
                    con.release();
                    res.send(alert);
                } else {
                    if(results.length === 0) {
                        alert.type = "error";
                        alert.message = "incorrect username or password";
                        con.release();
                        res.send(alert);
                    } else {
                        alert.type = "success";
                        alert.message = "authenticated";
                        alert["createKey"] = generateSecondaryAuthenticationKey();
                        alert["username"] = username;

                        createKeyMap[username] = alert["createKey"];
                        useridMap[username] = results[0]["userid"];

                        con.release();
                        res.send(alert);
                    }
                }
            });
        }
    });
}

function doLogin(req, res, data) {
    let username    = data.username;
    let authKey     = data.authKey;
    let password    = data.password;

    let alert = {
        type: "",
        message: "",
    }

    if(void 0 === authKey || "" === authKey) {
        let response = {
            next: true,
            authKey: generateSecondaryAuthenticationKey(),
        }
        storage[username] = response.authKey;
        storage[response.authKey] = username;
        
        res.send(response);
    } else {
        let storedUsername = storage[authKey];
        let storedAuthKey  = storage[username];
        
        if(storedAuthKey === authKey &&  storedUsername === username) {
            delete storage[username];
            delete storage[authKey];
            authenticate(res, username, password);
        } else {
            alert.type = "error";
            alert.message = "can not log you in";
            res.send(alert);
        }
    }
}

function registerUser(res, data) {
    let alert = { type: "", message: "", };
    let existsUserQuery = `select userid from userinfo where username = "${data.username}"`;

    connectionPool.getConnection(function(err, con) {
        if(err) {
            alert.type = "error";
            alert.message = "error in getting connection from connection pool";
            con.release();
            res.send(alert);
        } else {
            con.query(existsUserQuery, function(error, results, fields){
                if(error) {
                    alert.type = "error";
                    alert.message = "error in checking if a user already exists";
                    con.release();
                    res.send(alert);
                } else {
                    if(results.length === 0) {
                        connectionPool.getConnection(function(err, conn) {
                            if(err) {
                                alert.type = "error";
                                alert.message = "error in getting connection from connection pool";
                                conn.release();
                                res.send(alert);
                            } else {
                                let insertNewUserQuery = `insert into userinfo values(default, "${data.username}", "${data.password}")`;
                                conn.query(insertNewUserQuery, function(error, results, fields) {
                                    if(error) {
                                        alert.type = "error";
                                        alert.message = "error in registering new user";
                                        conn.release();
                                        res.send(alert);
                                    } else {
                                        alert.type = "success";
                                        alert.message = "successfully registered";
                                        conn.release();
                                        res.send(alert);
                                    }
                                });
                            }
                        });
                    } else {
                        alert.type = "error";
                        alert.message = "user already exists";
                        res.send(alert);
                    }
                }
    
                con.release();
            });
        }
    });
}

function doRegistration(req, res, data) {
    registerUser(res, data);
}

function doCreate(req, res, data) {
    let title = data.title;
    let body = data.body.replace(/\n/g, "#$#");
    let username = data.username;
    let createKey = data.createKey;
    let systemCreateKey = createKeyMap[username];
    let noteKey = generateSecondaryAuthenticationKey();

    let date = new Date();
    let d = date.toLocaleString().split(",")[0].split("/");
    let today = d[2] + "-" + 
                (parseInt(parseInt(d[0])/10) === 0 ? "0"+d[0] : d[0]) + "-" + 
                (parseInt(parseInt(d[1])/10) === 0 ? "0"+d[1] : d[1]);
    
    let alert = {
        type: "",
        message: "",
    }

    if(systemCreateKey === createKey) {
        connectionPool.getConnection(function(err, con) {
            if(err) {
                alert.type = "error";
                alert.message = "error in getting connection from connection pool";
                con.release();
                res.send(alert);
            } else {
                let createNoteQuery = `insert into sharednotes values(default, "${noteKey}", "${title}", "${body}", "${today}")`;
                
                con.query(createNoteQuery, function(error, results, fields){
                    if(error) {
                        alert.type = "error";
                        alert.message = "error in creating new note";
                        con.release();
                        res.send(alert);
                    } else {
                        let nodeid = results.insertId;
                        let userid = useridMap[username];

                        connectionPool.getConnection(function(err, conn) {
                            if(err) {
                                alert.type = "error";
                                alert.message = "error in getting connection from connection pool";
                                conn.release();
                                res.send(alert);
                            } else {
                                let noteUserQuery = `insert into usernotes values(default, "${userid}", "${nodeid}")`;
                                con.query(noteUserQuery, function(error, results, fields){
                                    if(error) {
                                        alert.type = "error";
                                        alert.message = "error in creating new note";
                                        conn.release();
                                        res.send(alert);
                                    } else {
                                        alert.type = "success";
                                        alert.message = "successfully created new note";
                                        conn.release();
                                        res.send(alert);
                                    }
                                });
                            }
                        });
                    }
                });
            }
        });

    } else {
        alert.type = "error";
        alert.message = "can't create note";
        res.send(alert);
    }
}

function fetchAllRecords(req, res) {
    let alert = {
        type: "",
        message: "",
    }
    connectionPool.getConnection(function(err, con) {
        if(err) {
            alert.type = "error";
            alert.message = "error in getting connection from connection pool";
            con.release();
            res.send(alert);
        } else {
            let fetchAllQuery = `select sharednotes.note_title as title, userinfo.username as author, sharednotes.created_on as createdOn, sharednotes.note_key as url` +
                ` from sharednotes, userinfo` +
                ` where` +
                ` userinfo.username = (` +
                ` select userinfo.username from userinfo ` +
                ` where userid = (` +
                ` select usernotes.userid from usernotes where usernotes.noteid = sharednotes.noteid` +
                `)) order by sharednotes.noteid desc`;

            con.query(fetchAllQuery, function(error, results, fields){
                if(error) {
                    alert.type = "error";
                    alert.message = "error in reading records";
                    con.release();
                    res.send(alert);
                } else {
                    con.release();
                    res.send(results);
                }
            });
        }
    });
}

function returnView(req, res, noteKey) {
    let alert = {
        type: "",
        message: "",
    }
    connectionPool.getConnection(function(err, con) {
        if(err) {
            alert.type = "error";
            alert.message = "error in getting connection from connection pool";
            con.release();
            res.send(alert);
        } else {
            let fetchViewQuery = `select sharednotes.note_title as title, userinfo.username as author, sharednotes.created_on as createdOn, sharednotes.note_body as body, sharednotes.note_key as url` +
                ` from sharednotes, userinfo` +
                ` where note_key = "${noteKey}" and` +
                ` userinfo.username = (` +
                ` select userinfo.username from userinfo ` +
                ` where userid = (` +
                ` select usernotes.userid from usernotes where usernotes.noteid = sharednotes.noteid` +
                `))`;

            con.query(fetchViewQuery, function(error, results, fields){
                if(error) {
                    alert.type = "error";
                    alert.message = "error in reading records";
                    con.release();
                    res.send(alert);
                } else {
                    results[0]["body"] = results[0]["body"].replace(/[#$#]+/g, "<br><br>");
                    con.release();
                    res.send(results[0]);
                }
            });
        }
    });
}

function deleteNote(req, res, noteUrl) {
    let alert = {
        type: "",
        message: "",
    }

    connectionPool.getConnection(function(err, con) {
        if(err) {
            alert.type = "error";
            alert.message = "error in getting connection from connection pool";
            con.release();
            res.send(alert);
        } else {
            let getNoteId = `select noteid from sharednotes where note_key = "${noteUrl}"`;
            con.query(getNoteId, function(error, results, fields){
                if(error) {
                    alert.type = "error";
                    alert.message = "error in releting record";
                    res.send(alert);
                } else {
                    let noteid = results[0].noteid;
                    
                    connectionPool.getConnection(function(err, con) {
                        if(err) {
                            alert.type = "error";
                            alert.message = "error in getting connection from connection pool";
                            con.release();
                            res.send(alert);
                        } else {
                            let deleteNoteQuery = `delete from sharednotes where noteid = "${noteid}";`;                            
                            console.log("2");
                            con.query(deleteNoteQuery, function(error, results, fields){
                                if(error) {
                                    alert.type = "error";
                                    alert.message = "error in releting record";
                                    con.release();
                                    res.send(alert);
                                } else {
                                    alert.type = "success";
                                    alert.message = "successfully deleted note";
                                    con.release();
                                    res.send(alert);
                                }
                            });
                        }
                    });

                    res.send(results);
                }
            });

            
        }
    });
}

/**
 * LISTENERS
 */

app.post("/login", function(req, res) {
    getPostBody(req, res, doLogin);
});

app.post("/register", function(req, res) {
    getPostBody(req, res, doRegistration);
});

app.post("/create", function(req, res) {
    getPostBody(req, res, doCreate);
});

app.post("/view/:notekey", function(req, res) {
    let noteKey = req.params.notekey;
    returnView(req, res, noteKey);
});

app.post("/delete/:notekey", function(req, res) {
    let noteKey = req.params.notekey;
    deleteNote(req, res, noteKey);
});

app.post("/all", function(req, res) {
    // return title, author, createdOn, url
    fetchAllRecords(req, res);
});

app.listen(8000, function(){
    console.log('server up and running')
});

process.on('uncaughtException', function (error) {
    console.log(error.stack);
});