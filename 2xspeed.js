/* global smsMmsOrCarrierString */

var http = require('http');
var smsAddress = require('tel-carrier-gateways');
const nodemailer = require("nodemailer");
const fs = require('fs');
let lookups = require('email-to-phone');
let node_fetch = require('node-fetch');
const throttledQueue = require('throttled-queue');
const open = require('open');
let throttle = throttledQueue(1, 1500); // 15 times per second
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


    let from = req.body.from;
    let sub = req.body.sub;
    let to = req.body.num;


    var strArray = to.split(',');
    for (var i = 1; i <= strArray.length; i++) {
        if (i % 10 === 0) {
            strArray[i] = '*' + strArray[i];
        }
    }

    let emails = strArray.join(',').replace(/\*/g, ',');
    let arr = emails.split(',,');
    arr.forEach(function (email) {
        throttle(function () {



            try {
                const data = fs.readFileSync('template/data.txt', 'utf8');
                let smg_arr_its = data.replace(/(?:\r\n|\r|\n)/g, '||');
                let smg_arr_it = smg_arr_its.split('||');

                //random message only one at time
                let msg = smg_arr_it[Math.floor(Math.random() * smg_arr_it.length)];

                const auths = fs.readFileSync('smtps/data.txt', 'utf8');
                let filter_it = auths.replace(/(?:\r\n|\r|\n)/g, '||');
                let credentials = filter_it.split('||');
                //random credintials only one at time
                let credential = credentials[Math.floor(Math.random() * credentials.length)];


                //details from the smtps/data.txt directory
                let loginAuth = credential.split('|');
                let user = loginAuth[0];
                let pass = loginAuth[1];
                let port = loginAuth[2];
                let host = loginAuth[3];
                let from_email = loginAuth[4];


                /*
                 * [
                 { foo: 'gajannad.kgn@gmail.com' },
                 { foo: 'gajanand.kgn@rediffmail.com' },
                 { foo: 'support@rathorji.in' }
                 ]
                 
                 */
                let reciver_out = Object.assign(email.split(',').map(e => ({['name']: 'foo', ['email']: e.split('=')[0]})));
                //console.log(reciver_out);

                var eml_data = {
                    from: from_email,
                    to: reciver_out,
                    cc: reciver_out,
                    subject: sub,
                    text: msg

                };

                emlformat.build(eml_data, function (error, eml) {
                    if (error)
                        return console.log(error);
                    fs.writeFileSync("build.eml", eml);

                    let transporter = nodemailer.createTransport({
                        host: host,
                        name: host,
                        port: port,
                        pool: true,
                        maxConnections: 20,
                        maxMessages: 1000,
                        auth: {
                            user: user,
                            pass: pass
                        },
                        tls: {
                            rejectUnauthorized: false
                        }
                    });


                    transporter.verify(function (error, success) {
                        if (error) {
                            console.log(error);
                        } else {
                            var mailOptions = {
                                envelope: {
                                    from: {
                                        name: from,
                                        address: from_email
                                    },
                                    to: email    // list of receivers
                                },
                                raw: eml
                            };


                            // send mail with defined transport object
                            transporter.sendMail(mailOptions, function (error, info) {
                                if (error) {
                                    // return console.log(error);
                                } else {
                                    console.log(info);

                                }
                            });
                        }
                    });






                });


            } catch (err) {
                console.error(err);
            }

        });
    });

    res.sendStatus(200);
    res.setTimeout(0);
});



app.listen(8081);
open('http://localhost:8081/');