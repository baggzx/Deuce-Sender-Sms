/* global smsMmsOrCarrierString, transporter */

var http = require('http');
var smsAddress = require('tel-carrier-gateways');
const nodemailer = require("nodemailer");
const fs = require('fs');
let lookups = require('email-to-phone');
let node_fetch = require('node-fetch');
const throttledQueue = require('throttled-queue');

// 1000 means 1 secound  if you want to
//increase the speeed then you have to descrese the number 500 it will fast 
const open = require('open');
var emlformat = require('eml-format');



var express = require('express');
var bodyParser = require('body-parser');
var app = express();
app.use(bodyParser.json({limit: '50mb'}));
app.use(bodyParser.urlencoded({limit: '50mb', extended: true}));


//create a server object:
var urlencodedParser = bodyParser.urlencoded({extended: false});

app.get('/', (req, res) => {
    res.sendFile(__dirname + '/index.html');
});

app.post('/myaction', urlencodedParser, (req, res) => {


    let sub = req.body.sub;
    let to = req.body.num;
    let secure = (req.body.secure === true);
    let sending_speed = parseInt(req.body.sending_speed);
    let smtp_change = parseInt(req.body.smtp_change);



    //queqe
    let throttle = throttledQueue(1, sending_speed);

    var strArray = to.split(',');

    var i = 0;
    //smtp login
    try {
        const smtps_data = fs.readFileSync('smtps/data.txt', 'UTF-8');
        const lines = smtps_data.split(/\r?\n/);
        let total = lines.length;

        let loginAuth = lines[i].split('|');

        let user = loginAuth[0];
        let pass = loginAuth[1];
        let port = loginAuth[2];
        let host = loginAuth[3];
        let from_email = loginAuth[4];
        let transporter = nodemailer.createTransport({
            host: host,
            name: host,
            port: port,
            secureConnection: secure,
            auth: {
                user: user,
                pass: pass
            },
            tls: {
                ciphers: 'SSLv3',
                rejectUnauthorized: false
            }

        });


        if (total > 1) {

            function myLoop() {
                setTimeout(function () {


                    //details from the smtps/data.txt directory
                    loginAuth = lines[i].split('|');
                    user = loginAuth[0];
                    pass = loginAuth[1];
                    port = loginAuth[2];
                    host = loginAuth[3];
                    from_email = loginAuth[4];

                    transporter = nodemailer.createTransport({
                        host: host,
                        name: host,
                        port: port,
                        secureConnection: secure,

                        auth: {
                            user: user,
                            pass: pass
                        },
                        tls: {
                            ciphers: 'SSLv3',
                            rejectUnauthorized: false
                        }

                    });

                    myLoop();


                    i++;
                    let sec = Math.floor(smtp_change / 1000);

                    if (i === total) {
                        i = 0;
                        transporter.close();
                    }

                }, smtp_change);
            }

            if (smtp_change !== 1) {
                myLoop();
            }


        }




        transporter.verify(function (error, success) {
            if (error) {
                console.log(error);
            } else {
                strArray.forEach(function (email) {
                    throttle(function () {
                        try {

                            const data = fs.readFileSync('template/data.txt', 'utf8');
                            let smg_arr_its = data.replace(/(?:\r\n|\r|\n)/g, '||');
                            let smg_arr_it = smg_arr_its.split('||');

                            //random message only one at time
                            let msg = smg_arr_it[Math.floor(Math.random() * smg_arr_it.length)].trim();


                            var email_data = {
                                from: from_email,
                                to: {
                                    email: email
                                },
                                subject: sub,
                                text: msg

                            };

                            emlformat.build(email_data, function (error, eml) {
                                if (error)
                                    return console.log(error);

                                fs.writeFileSync("build.eml", eml);//create the email file

                                var mailOptions = {
                                    envelope: {
                                        from: from_email,
                                        to: email
                                    },
                                    raw: {
                                        path: 'build.eml'
                                    }
                                };




                                // send mail with defined transport object
                                transporter.sendMail(mailOptions, function (error, info) {
                                    if (error) {
                                        return console.log(error);
                                    } else {
                                        console.log(info);
                                        console.log('Message sent: ' + email + ' ' + info.response);
                                    }
                                });


                            });

                        } catch (err) {
                            console.error(err);
                        }

                    });
                });

            }
        });



    } catch (err) {
        console.error(err);
    }

    res.sendStatus(200);
    // res.status(204).send();
    res.setTimeout(0);
});



app.listen(8081);
open('http://localhost:8081/');