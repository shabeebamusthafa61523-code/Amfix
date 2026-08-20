import mongoose from "mongoose";
import { validationResult } from "express-validator";
import ProjectCategory from "../models/projectCategory.model.js";
import Department from "../modules/departments/department.model.js";
import { sendSuccess, sendError } from "../utils/response.helper.js";

export const getProjectCategories = async (req, res) => {
  try {
    const { departmentId } = req.query;

    if (!departmentId) {
      return sendSuccess(res, "Project categories retrieved successfully", []);
    }

    if (!mongoose.Types.ObjectId.isValid(departmentId)) {
      return sendError(res, "Invalid Department ID format", 400);
    }

    const categories = await ProjectCategory.find({ departmentId })
      .sort({ name: 1 })
      .exec();

    return sendSuccess(
      res,
      "Project categories retrieved successfully",
      categories,
    );
  } catch (error) {
    console.error("getProjectCategories Error:", error);
    return sendError(res, "Failed to load project categories", 500);
  }
};

export const createProjectCategory = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return sendError(res, errors.array()[0].msg, 400);
    }

    const name = String(req.body.name || "").trim();
    const { departmentId } = req.body;

    if (!name) {
      return sendError(res, "Category name is required", 400);
    }

    if (!departmentId || !mongoose.Types.ObjectId.isValid(departmentId)) {
      return sendError(res, "A valid Department ID is required", 400);
    }

    const department = await Department.findById(departmentId);
    if (!department) {
      return sendError(res, "Selected department does not exist", 400);
    }

    const duplicate = await ProjectCategory.findOne({
      departmentId,
      name: {
        $regex: new RegExp(
          `^${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`,
          "i",
        ),
      },
    });

    if (duplicate) {
      return sendError(
        res,
        "A category with this name already exists for the selected department",
        409,
      );
    }

    const userId = req.user?.id || req.user?._id || req.user?.userId || null;

    const category = await ProjectCategory.create({
      name,
      departmentId,
      createdBy: userId,
    });

    return sendSuccess(
      res,
      "Project category created successfully",
      category,
      201,
    );
  } catch (error) {
    console.error("createProjectCategory Error:", error);
    if (error.code === 11000) {
      return sendError(
        res,
        "A category with this name already exists for the selected department",
        409,
      );
    }
    return sendError(res, "Failed to create project category", 500);
  }
};
