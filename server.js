if(process.env.NODE_ENV !== "production"){
    require("dotenv").config()
}

// Import library
const express = require("express")
const app = express()
const bcrypt = require("bcrypt")
const passport = require("passport")
const initializePassport = require("./passport-config")
const flash = require("express-flash")
const session = require("express-session")
const methodOverride = require("method-override")
// const bodyParser = require("body-parser")
const { check, validationResult} = require("express-validator")

app.set('view engine', 'ejs')

initializePassport(
    passport,
    email => users.find(user => user.email === email),
    id => users.find(user => user.id === id)
)

const users = []
const tour = []

// const urlencodedParser = bodyParser.urlencoded({extended: false})

app.use(express.urlencoded({extended: false}))
app.use(flash())
app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false, // wont resave the session variable if nothing changed
    saveUninitialized: false
}))
app.use(passport.initialize())
app.use(passport.session())
app.use(methodOverride("_method"))

// Configure login functionality
app.post("/login", checkNotAuthenthicated, passport.authenticate("local", {
    successRedirect: "/",
    failureRedirect: "/login",
    failureFlash: true
}))

// Configure register functionality
app.post("/register", checkNotAuthenthicated, [
    check('email')
    .isAlphanumeric().withMessage('Username must be alphanumeric')
    .isLength({min: 6, max: 15}).withMessage('Username must be 6-15 character long'),
    check('phone')
    .isNumeric().withMessage('Phone must be numeric'),
    check('password')
    .isLength({min: 8, max: 16}).withMessage('Password must be 8-16 character long')
], async (req, res) => {

    const errors = validationResult(req);

    if (!errors.isEmpty()) {
        const alert = errors.array()
        return res.render("register", {
            alert
        })
    }

    try{

        const hashedPassword = await bcrypt.hash(req.body.password, 10)
        users.push({
            id: Date.now().toString(),
            name: req.body.name,
            phone: req.body.phone,
            email: req.body.email,
            password: hashedPassword,
        })
        console.log(users);
        res.redirect("/login")
    } catch (e){
        console.log(e);
        res.redirect("/register")
    }
})

// Configure register tour functionality
app.post("/registertour", checkNotAuthenthicated, [
    check('tname')
    .isAlphanumeric().withMessage('Team Name must be alphanumeric')
    .isLength({min: 4, max: 15}).withMessage('Team Name must be 4-15 character long')
    .custom(value => {
        return users.findOne({ where: {name: value} })
        .then(() => {
            return Promise.reject('Team Name already taken')
        })
    })
], async (req, res) => {

    const errors = validationResult(req);

    if (!errors.isEmpty()) {
        const alert = errors.array()
        return res.render("registertour", {
            alert
        })
    }

    try{

        users.push({
            id: Date.now().toString(),
            name: req.body.name,
            phone: req.body.phone,
            team_name: req.body.tname,
            team_captain: req.body.tcaptain,
            team_member: req.body.tmember
        })
        console.log(users);
        res.redirect("/finish")
    } catch (e){
        console.log(e);
        res.redirect("/registertour")
    }
})

// Routes
app.get('/', checkAuthenticated, (req, res) => {
    res.render("index.ejs", {name: req.user.name})
})

app.get('/finish', checkAuthenticated, (req, res) => {
    res.render("finish.ejs", {name: req.user.name})
})

app.get('/login', checkNotAuthenthicated, (req, res) => {
    res.render("login.ejs")
})

app.get('/register', checkNotAuthenthicated, (req, res) => {
    res.render("register.ejs")
})

app.get('/registertour', checkAuthenticated, (req, res) => {
    res.render("registertour.ejs")
})

// End Routes

app.delete("/logout", (req, res) => {
    req.logout(req.user, err => {
        if(err) return next(err)
        res.redirect("/")
    })
})

function checkAuthenticated(req, res, next){
    if(req.isAuthenticated()){
        return next()
    }
    res.redirect("/login")
}

function checkNotAuthenthicated(req, res, next){
    if(req.isAuthenticated()){
        return res.redirect("/")
    }
    next()
}

app.listen(3000)