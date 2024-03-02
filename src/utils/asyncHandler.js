// METHOD - 1 :
const asyncHandler = (reqHandler) => {
    return (req, res, next) => {
        Promise.resolve(reqHandler(req, res, next)).catch((err) => next(err));
    };
};

// METHOD - 2
// const asyncHandler = (asyncFunc) => async (req,res,next) => {
//     try {
//         await asyncFunc(req,res,next)
//     } catch (error) {
//         res.status(err.code || 500).json({
//             success: false,
//             message: error.message
//         })
//     }
// }

export { asyncHandler };
