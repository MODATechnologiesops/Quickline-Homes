import express from "express";

import {
    register,
    login,
    getMe
} from "../controllers/auth.controller.js";

import {
    authenticate
} from "../middleware/auth.middleware.js";

const router = express.Router();


// POST /api/auth/register
router.post("/register", register);


// POST /api/auth/login
router.post("/login", login);


// GET /api/auth/me
router.get("/me", authenticate, getMe);


export default router;