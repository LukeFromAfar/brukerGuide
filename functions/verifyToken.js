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
                // Redirect to the guide page with an alert if the token has expired
                return res.redirect(`/guide/${req.params.id}?alert=sessionExpired`);
            } else {
                // Redirect to the guide page if the token is invalid
                return res.redirect(`/guide/${req.params.id}?alert=invalidToken`);
            }
        }
    } else {
        // If no token, set user to null and allow the request to proceed
        req.user = null;
        res.locals.user = null;
    }
    next(); // Continue to the next middleware or route handler
}

module.exports = verifyToken;