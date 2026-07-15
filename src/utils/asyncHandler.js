const asyncHandler = (requestHandler) => {
    return (req, res, next) => {
        Promise.resolve(requestHandler(req, res, next))
        .catch(next); //.catch automatically passes the err/reason as the first arg of callback
        // or .catch((err) => next(err)) 
    }
}

export default asyncHandler

//try catch method
// const asyncHandler = (requestHandler) => async (req, res, next) =>{
//     try{
//         await requestHandler(req, res, next)
//     }catch(err){
//         res.status(err.statusCode || 500).json({
//             success: false,
//             message: err.message
//         })
//     }
// }