const jwt = require("jsonwebtoken");
const secretKey = process.env.JWT_SECRET_KEY;

function verifyToken(req, res, next) {
    const token = req.cookies.token;

    if (token) {
        try {
            const verifiedUser = jwt.verify(token, secretKey);

            // Attach user data to req and res.locals
            req.user = verifiedUser;
            res.locals.user = verifiedUser;
        } catch (error) {
            if (error.name === 'TokenExpiredError') {
                return res.status(401).render('404', { message: 'Your session has expired. Please log in again.' });
            } else {
                return res.status(401).render('404', { message: 'Invalid token. Please try again.' });
            }
        }
    } else {
        // If no token, set user to null but allow the request to proceed
        req.user = null;
        res.locals.user = null;
    }
    next(); // Continue to the next middleware or route handler
}
module.exports = verifyToken;