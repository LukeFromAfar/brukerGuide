const jwt = require("jsonwebtoken");
function verifyToken(req, res, next) {
    const token = req.cookies.token; // Assuming the token is stored in a cookie

    if (!token) {
        // If no token is provided, deny access
        req.user = null;
        res.locals.user = null;
        return res.status(403).render('404', { message: 'Access Denied: No Token Provided!' });
    }

    try {
        // Verify the token
        const verifiedUser = jwt.verify(token, process.env.JWT_SECRET_KEY);

        // Attach user data to req and res.locals
        req.user = verifiedUser;
        res.locals.user = verifiedUser;

        next(); // Continue to the next middleware or route handler
    } catch (error) {
        // Handle specific JWT errors
        if (error.name === 'TokenExpiredError') {
            return res.status(401).render('404', { message: 'Your session has expired. Please log in again.' });
        } else {
            return res.status(401).render('404', { message: 'Invalid token. Please try again.' });
        }
    }
}
module.exports = verifyToken;