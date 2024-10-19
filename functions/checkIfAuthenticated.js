const jwt = require('jsonwebtoken');
const secretKey = process.env.JWT_SECRET_KEY;


function checkIfAuthenticated(req, res, next) {
  const token = req.cookies.token || req.headers['authorization'];

  if (token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY);
      req.user = decoded; // Attach the user info to the request object
      next(); // Proceed to the next middleware/route handler
    } catch (err) {
      // Token is invalid
      res.clearCookie('token'); // Clear the invalid token
      req.user = null; // Ensure no user is attached to the request
      next(); // Proceed to the next middleware/route handler
    }
  } else {
    // No token found
    req.user = null;
    next();
  }
}

module.exports = checkIfAuthenticated;