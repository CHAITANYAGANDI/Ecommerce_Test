const joi = require('joi');
const { STRONG_PASSWORD_REGEX, STRONG_PASSWORD_MESSAGE } = require('../utils/passwordPolicy');


const signupValidation = (req,res,next)=> {
    const schema = joi.object({
        
        name:joi.string().min(3).max(100).required(),
        email:joi.string().email().required(),
        password: joi.string()
            .min(8)
            .max(100)
            .pattern(STRONG_PASSWORD_REGEX)
            .required()
            .messages({
                'string.pattern.base': STRONG_PASSWORD_MESSAGE,
                'string.min': 'Password must be at least 8 characters.'
            })
    });

    const {error} = schema.validate(req.body);

    if (error){

        return res.status(400).json({message:"Bad Request",error})
    }

    next();
}


const loginvalidation = (req,res,next)=> {
    const schema = joi.object({
        email: joi.string().email().required(),
        password: joi.string().min(4).max(100).required()

    });

    const {error} = schema.validate(req.body);

    if (error){
        return res.status(400).json({message:'Bad request',error})
    }
    
    next();
}


module.exports = {
    signupValidation,
    loginvalidation
}
