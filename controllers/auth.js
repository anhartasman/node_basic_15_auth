const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const User = require('../models/user');
const nodemailer = require('nodemailer');
const { validationResult } = require('express-validator');

const transporter = nodemailer.createTransport({
  host: 'in-v3.mailjet.com',
  port: 587,
  auth: {
    user: '3fef486b1b76c9241580dfcc348b7db4',
    pass: 'e09898d7fbe18be3ff332e5ac985c0f1',
  },
});

exports.getLogin = (req, res, next) => {
  let message = req.flash('error');
  if(message.length>0){
    message = message[0];
  }else{
    message = null
  }
  res.render('auth/login', {
    path: '/login',
    pageTitle: 'Login',
    errorMessage:message
  });
};

exports.getSignup = (req, res, next) => {
  let message = req.flash('error');
  if(message.length>0){
    message = message[0];
  }else{
    message = null
  }
  res.render('auth/signup', {
    path: '/signup',
    pageTitle: 'Signup',
    errorMessage:message
  });
};

exports.postLogin = (req, res, next) => {
  const email = req.body.email;
  const password = req.body.password;
  User.findOne({email:email})
    .then(user => {
      if(!user){
        req.flash('error','Invalid email.'); 
        return res.redirect('/login');
      }
      bcrypt.compare(password,user.password).then(doMatch=>{
        if(doMatch){
          req.session.isLoggedIn = true;
          req.session.user = user;
          return req.session.save(err => {
            console.log(err);
              res.redirect('/');
          }); 
        }
        req.flash('error','Invalid password.');
        res.redirect('/login');
      }).catch(err=>{
        console.log(err);
        res.redirect('/login');
      });
    })
    .catch(err => console.log(err));
};

exports.postSignup = (req, res, next) => {
  const email = req.body.email;
  const password = req.body.password;
  const errors = validationResult(req);
  if(!errors.isEmpty()){
    console.log(errors.array());
    return res.status(422).render('auth/signup', {
      path: '/signup',
      pageTitle: 'Signup',
      errorMessage:errors.array()[0].msg
    });
  }
    return bcrypt.hash(password,12).then(hashedPassword=>{
      const user = new User({
        email : email,
        password : hashedPassword,
        cart : {
          items : []
        }
      });
      return user.save();
  
    }).then(result=>{
      res.redirect('/login');
      return transporter.sendMail({
        to:email,
        from:'cirengmantab23@gmail.com',
        subject:'Signup succeded!',
        html:'<h1>You successfully signed up!</h1>'
      });
    }).catch(err=>{
      console.log(err)
    });
};

exports.postLogout = (req, res, next) => {
  req.session.destroy(err => {
    console.log(err);
    res.redirect('/');
  });
};


exports.getReset = (req, res, next) => {
  let message = req.flash('error');
  if(message.length>0){
    message = message[0];
  }else{
    message = null
  }
  res.render('auth/reset', {
    path: '/reset',
    pageTitle: 'Reset',
    errorMessage:message
  });
};

exports.postReset = (req, res, next) => {
  crypto.randomBytes(32,(err,buffer)=>{
    if(err){
      console.log(err);
      return res.redirect('/reset');
    }
    const token = buffer.toString('hex');
    const email = req.body.email; 
    User.findOne({email:email})
      .then(user => {
        if(!user){
          req.flash('error','Invalid email.'); 
          return res.redirect('/reset');
        }
        user.resetToken = token;
        user.resetTokenExpiration = Date.now()+3600000;
        return user.save();
      }).then((result)=>{
        res.redirect('/');
        transporter.sendMail({
        to:email,
        from:'cirengmantab23@gmail.com',
        subject:'Password Reset',
        html:`
          <p>You requested a password reset</p>
          <p>Click this <a href="http://localhost:3000/reset/${token}">link</a> to set a new password.</p>
        `
      });
      })
      .catch(err => console.log(err));
  })
};


exports.getNewPassword = (req, res, next) => {
  const token = req.params.token;
  User.findOne({
    resetToken:token,
    resetTokenExpiration:{$gt: Date.now()}
  }).then(user=>{ 
    let message = req.flash('error');
    if(message.length>0){
      message = message[0];
    }else{
      message = null
    }
    res.render('auth/new-password', {
      path: '/new-password',
      pageTitle: 'New Password',
      errorMessage:message,
      userId: user._id.toString(),
      passwordToken: token
    });
  }).catch(err=>{
    console.log(err)
  });

};

exports.postNewPassword = (req, res, next) => {
  const newPassword = req.body.password;
  const userId = req.body.userId;
  const passwordToken = req.body.passwordToken;
  let resetUser;
  User.findOne({
    resetToken:passwordToken,
    resetTokenExpiration:{$gt: Date.now()},
    _id:userId
  }).then(user=>{ 
    resetUser = user;
    return bcrypt.hash(newPassword,12);
  }).then(hashedPassword=>{
    resetUser.password = hashedPassword;
    resetUser.resetToken = undefined;
    resetUser.resetTokenExpiration = undefined;
    return resetUser.save();
  }).then(result=>{
    res.redirect('/login');
  }).catch(err=>{
    console.log(err)
  });
}