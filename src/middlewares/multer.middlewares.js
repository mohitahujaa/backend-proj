import multer from 'multer';

const storage = multer.diskStorage({
    destination: function(req, file, cb){
        cb(null, "./public/temp");
    },
    filename: function(req, file, cb){
        cb(null, file.originalname)
    }
})

const upload = multer({
    storage: storage
})

// in es6 if both var name are same you can write as 
// multer({ storage, }) instead of storage: storagejjj