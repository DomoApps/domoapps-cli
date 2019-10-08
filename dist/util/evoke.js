/**
 * curry a function
 */
module.exports = function evoke(fn, message, submessage) {
    return function (result) {
        fn(message, submessage, result);
    };
};
//# sourceMappingURL=evoke.js.map