import multer from 'multer';
import path from 'path';
import { randomUUID } from 'crypto';
import fs from 'fs';

function ensureDir(dir: string) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

const storage = multer.diskStorage({
  destination(req, file, cb) {
    const dir = file.fieldname === 'avatar' ? 'uploads/avatars' : 'uploads/posts';
    ensureDir(dir);
    cb(null, dir);
  },
  filename(req, file, cb) {
    const ext = path.extname(file.originalname).toLowerCase() || '.jpg';
    cb(null, `${randomUUID()}${ext}`);
  },
});

const imageFilter = (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowed = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
  if (allowed.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed (jpeg, png, gif, webp)'));
  }
};

export const avatarUpload = multer({
  storage,
  fileFilter: imageFilter,
  limits: { fileSize: 5 * 1024 * 1024 },
}).single('avatar');

export const postImageUpload = multer({
  storage,
  fileFilter: imageFilter,
  limits: { fileSize: 10 * 1024 * 1024 },
}).single('image');

export const postImagesUpload = multer({
  storage,
  fileFilter: imageFilter,
  limits: { fileSize: 10 * 1024 * 1024 },
}).array('images', 5);

const lessonStorage = multer.diskStorage({
  destination(req, file, cb) {
    const dir = 'uploads/lessons';
    ensureDir(dir);
    cb(null, dir);
  },
  filename(req, file, cb) {
    const ext = path.extname(file.originalname).toLowerCase() || '.bin';
    cb(null, `${randomUUID()}${ext}`);
  },
});

const lessonFileFilter = (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowed = [
    'application/pdf',
    'application/zip',
    'application/x-zip-compressed',
    'video/mp4',
    'video/quicktime',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  ];
  if (allowed.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Only PDF, ZIP, MP4, MOV, DOCX, and PPTX files are allowed'));
  }
};

export const lessonFileUpload = multer({
  storage: lessonStorage,
  fileFilter: lessonFileFilter,
  limits: { fileSize: 200 * 1024 * 1024 },
}).single('file');
