const User = require("../models/user");
const { Op } = require("sequelize");

exports.register = (req, res) => {
  const { username, email, password, confirmPassword } = req.body;

  if (!username || !email || !password || !confirmPassword) {
    req.flash("error", "All fields are required");
    return res.redirect("/register");
  }

  if (password !== confirmPassword) {
    req.flash("error", "Passwords do not match");
    return res.redirect("/register");
  }

  User.findOne({
    where: {
      [Op.or]: [{ username }, { email }],
    },
  })
    .then((existingUser) => {
      if (existingUser) {
        req.flash("error", "Username or email already exists");
        return res.redirect("/register");
      }

      return User.create({ username, email, password });
    })
    .then((user) => {
      req.flash("success", "Registration successful! Please login.");
      res.redirect("/login");
    })
    .catch((error) => {
      console.error("Registration error:", error);
      req.flash("error", "An error occurred during registration");
      res.redirect("/register");
    });
};

exports.login = (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    req.flash("error", "All fields are required");
    return res.redirect("/login");
  }

  User.findOne({ where: { email } })
    .then((user) => {
      if (!user) {
        req.flash("error", "Invalid credentials");
        return res.redirect("/login");
      }
      return user
        .validatePassword(password)
        .then((isMatch) => {
          if (!isMatch) {
            req.flash("error", "Invalid credentials");
            return res.redirect("/login");
          }
          return user.update({ isOnline: true, lastSeen: new Date() });
        })
        .then(() => {
          req.session.user = {
            id: user.id,
            username: user.username,
            email: user.email,
            avatar: user.avatar,
          };
          res.redirect("/chat");
        });
    })
    .catch((error) => {
      console.error("Login error:", error);
      req.flash("error", "An error occurred during login");
      res.redirect("/login");
    });
};

exports.logout = (req, res) => {
  if (req.session.user) {
    User.update(
      { isOnline: false, lastSeen: new Date() },
      { where: { id: req.session.user.id } }
    )
      .then(() => req.session.destroy())
      .then(() => res.redirect("/login"))
      .catch((error) => {
        console.error("Logout error:", error);
        res.redirect("/chat");
      });
  } else {
    res.redirect("/login");
  }
};

exports.renderLogin = (req, res) => {
  if (req.session.user) {
    return res.redirect("/chat");
  }
  res.render("login", {
    title: "Login",
    error: req.flash("error"),
    success: req.flash("success"),
  });
};

exports.renderRegister = (req, res) => {
  if (req.session.user) {
    return res.redirect("/chat");
  }
  res.render("register", {
    title: "Register",
    error: req.flash("error"),
    success: req.flash("success"),
  });
};
