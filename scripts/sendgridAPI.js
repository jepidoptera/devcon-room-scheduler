// using SendGrid's v3 Node.js Library
// https://github.com/sendgrid/sendgrid-nodejs
const sgMail = require('@sendgrid/mail');
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

module.exports = {
    send: (message) => {
        // {
        //   to: '',
        //   from: '',
        //   subject: '',
        //   text: '',
        //   html: '',
        // }
        console.log("sending: ", message);
        sgMail.send(message);
    }
}