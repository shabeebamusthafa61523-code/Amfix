// ── src/models/task.model.js ──

import mongoose from 'mongoose';

const taskSchema = new mongoose.Schema(
  {
    // ============================================================
    // BASIC TASK INFORMATION
    // ============================================================

    title: {
      type: String,
      required: true,
      trim: true
    },

    description: {
      type: String,
      default: ''
    },

    // ============================================================
    // TASK USERS
    // ============================================================

    assigned_to: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      }
    ],

    created_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },

    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },

    // ============================================================
    // TASK STATUS
    // ============================================================

    status: {
      type: String,
      enum: ['pending', 'current', 'preview', 'done'],
      default: 'pending'
    },

    priority: {
      type: String,
      enum: ['low', 'medium', 'high'],
      default: 'medium'
    },

    // ============================================================
    // LEGACY FILE / IMAGE SUPPORT
    // ============================================================

    file_url: {
      type: String
    },

    file_public_id: {
      type: String
    },

    // ============================================================
    // DESIGNATION
    // ============================================================

    designation_id: {
      type: String
    },

    // ============================================================
    // CLIENT / PROJECT
    // ============================================================

    client: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Client',
      default: null
    },

    project: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Project',
      default: null
    },

    // ============================================================
    // DUE DATE
    // ============================================================

    dueDate: {
      type: Date
    },

    // ============================================================
    // TASK ATTACHMENTS
    // ============================================================

    attachments: [
      {
        url: {
          type: String,
          required: true
        },

        name: {
          type: String,
          default: 'Attachment'
        },

        public_id: {
          type: String
        },

        path: {
          type: String,
          default: null
        },

        fileType: {
          type: String,
          enum: ['image', 'file'],
          default: 'file'
        },

        size: {
          type: Number,
          default: 0
        },

        uploaded_by: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User'
        },

        uploadedAt: {
          type: Date,
          default: Date.now
        }
      }
    ],

    // ============================================================
    // TASK COLLABORATION COMMENTS
    // ============================================================

    comments: [
      {
        author: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
          required: true
        },

        comment: {
          type: String,
          required: true,
          trim: true,
          maxlength: 5000
        },

        // --------------------------------------------------------
        // COMMENT ATTACHMENTS
        // --------------------------------------------------------

        attachments: [
          {
            url: {
              type: String,
              required: true
            },

            name: {
              type: String,
              default: 'Attachment'
            },

            public_id: {
              type: String
            },

            path: {
              type: String,
              default: null
            },

            fileType: {
              type: String,
              enum: ['image', 'file'],
              default: 'file'
            },

            size: {
              type: Number,
              default: 0
            }
          }
        ],

        createdAt: {
          type: Date,
          default: Date.now
        },

        updatedAt: {
          type: Date,
          default: Date.now
        }
      }
    ],

    // ============================================================
    // TASK LINKS
    // ============================================================

    links: [
      {
        title: {
          type: String,
          trim: true
        },

        url: {
          type: String,
          trim: true
        }
      }
    ],

    // ============================================================
    // SUBTASKS
    // ============================================================

    subtasks: [
      {
        title: {
          type: String,
          required: true,
          trim: true
        },

        completed: {
          type: Boolean,
          default: false
        },

        created_by: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User'
        },

        completed_by: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User'
        },

        createdAt: {
          type: Date,
          default: Date.now
        }
      }
    ]
  },
  {
    timestamps: true,

    // ==========================================================
    // JSON TRANSFORM
    // ==========================================================

    toJSON: {
      transform: (doc, ret) => {
        // ------------------------------------------------------
        // TASK ID
        // ------------------------------------------------------

        if (ret._id) {
          ret.id = ret._id.toString();
        }

        // ------------------------------------------------------
        // CREATED BY / USER ID
        // ------------------------------------------------------

        if (ret.created_by) {
          if (
            typeof ret.created_by === 'object' &&
            (ret.created_by._id || ret.created_by.id)
          ) {
            const idVal =
              ret.created_by._id ||
              ret.created_by.id;

            ret.user_id = idVal
              ? idVal.toString()
              : undefined;
          } else {
            ret.user_id = ret.created_by.toString();
          }
        }

        // ------------------------------------------------------
        // LEGACY FILE NORMALIZATION
        // ------------------------------------------------------

        if (ret.file_url) {
          ret.file = ret.file_url;
          ret.image = ret.file_url;
        }

        // ------------------------------------------------------
        // ASSIGNED USERS NORMALIZATION
        // ------------------------------------------------------

        if (Array.isArray(ret.assigned_to)) {
          ret.assigned_to = ret.assigned_to.map((user) => {
            if (!user) return user;

            if (
              typeof user === 'object' &&
              (user._id || user.id)
            ) {
              const userId =
                user._id || user.id;

              const cleanUser = {
                ...user,
                id: userId.toString()
              };

              delete cleanUser._id;

              return cleanUser;
            }

            return user.toString();
          });
        }

        // ------------------------------------------------------
        // CLIENT NORMALIZATION
        // ------------------------------------------------------

        if (
          ret.client &&
          typeof ret.client === 'object' &&
          (ret.client._id || ret.client.id)
        ) {
          const clientId =
            ret.client._id || ret.client.id;

          ret.client = {
            ...ret.client,
            id: clientId.toString()
          };

          delete ret.client._id;
        } else if (ret.client) {
          ret.client = ret.client.toString();
        }

        // ------------------------------------------------------
        // PROJECT NORMALIZATION
        // ------------------------------------------------------

        if (
          ret.project &&
          typeof ret.project === 'object' &&
          (ret.project._id || ret.project.id)
        ) {
          const projectId =
            ret.project._id || ret.project.id;

          ret.project = {
            ...ret.project,
            id: projectId.toString()
          };

          delete ret.project._id;
        } else if (ret.project) {
          ret.project = ret.project.toString();
        }

        // ------------------------------------------------------
        // SUBTASK NORMALIZATION
        // ------------------------------------------------------

        if (Array.isArray(ret.subtasks)) {
          ret.subtasks = ret.subtasks.map((st) => {
            if (!st) return st;

            const stObj =
              typeof st.toObject === 'function'
                ? st.toObject()
                : st;

            const stId = stObj._id
              ? stObj._id.toString()
              : stObj.id || '';

            let created_by = stObj.created_by;

            if (
              created_by &&
              typeof created_by === 'object' &&
              (created_by._id || created_by.id)
            ) {
              const createdById =
                created_by._id || created_by.id;

              created_by = {
                ...created_by,
                id: createdById.toString()
              };

              delete created_by._id;
            } else if (created_by) {
              created_by = created_by.toString();
            }

            let completed_by = stObj.completed_by;

            if (
              completed_by &&
              typeof completed_by === 'object' &&
              (completed_by._id || completed_by.id)
            ) {
              const completedById =
                completed_by._id || completed_by.id;

              completed_by = {
                ...completed_by,
                id: completedById.toString()
              };

              delete completed_by._id;
            } else if (completed_by) {
              completed_by = completed_by.toString();
            }

            const cleanSt = {
              ...stObj,
              id: stId,
              created_by,
              completed_by
            };

            delete cleanSt._id;

            return cleanSt;
          });
        }

        // ------------------------------------------------------
        // COMMENT NORMALIZATION
        // ------------------------------------------------------

        if (Array.isArray(ret.comments)) {
          ret.comments = ret.comments.map((comment) => {
            if (!comment) return comment;

            const cleanComment = {
              ...comment
            };

            // --------------------------------------------------
            // COMMENT ID
            // --------------------------------------------------

            if (cleanComment._id) {
              cleanComment.id =
                cleanComment._id.toString();
            } else if (!cleanComment.id) {
              cleanComment.id = '';
            }

            // --------------------------------------------------
            // AUTHOR
            // --------------------------------------------------

            if (
              cleanComment.author &&
              typeof cleanComment.author === 'object'
            ) {
              const authorId =
                cleanComment.author._id ||
                cleanComment.author.id;

              if (authorId) {
                cleanComment.author = {
                  ...cleanComment.author,
                  id: authorId.toString()
                };

                delete cleanComment.author._id;
              }
            } else if (cleanComment.author) {
              cleanComment.author =
                cleanComment.author.toString();
            }

            // --------------------------------------------------
            // COMMENT ATTACHMENTS
            // --------------------------------------------------

            if (Array.isArray(cleanComment.attachments)) {
              cleanComment.attachments =
                cleanComment.attachments.map((file) => {
                  if (!file) return file;

                  const cleanFile = {
                    ...file
                  };

                  if (cleanFile._id) {
                    cleanFile.id =
                      cleanFile._id.toString();

                    delete cleanFile._id;
                  }

                  return cleanFile;
                });
            }

            delete cleanComment._id;

            return cleanComment;
          });
        }

        // ------------------------------------------------------
        // CLEAN INTERNAL FIELDS
        // ------------------------------------------------------

        delete ret._id;
        delete ret.file_public_id;
        delete ret.__v;

        return ret;
      }
    },

    // ==========================================================
    // OBJECT TRANSFORM
    // ==========================================================

    toObject: {
      transform: (doc, ret) => {
        // ------------------------------------------------------
        // TASK ID
        // ------------------------------------------------------

        if (ret._id) {
          ret.id = ret._id.toString();
        }

        // ------------------------------------------------------
        // CREATED BY / USER ID
        // ------------------------------------------------------

        if (ret.created_by) {
          if (
            typeof ret.created_by === 'object' &&
            (ret.created_by._id || ret.created_by.id)
          ) {
            const idVal =
              ret.created_by._id ||
              ret.created_by.id;

            ret.user_id = idVal
              ? idVal.toString()
              : undefined;
          } else {
            ret.user_id =
              ret.created_by.toString();
          }
        }

        // ------------------------------------------------------
        // LEGACY FILE NORMALIZATION
        // ------------------------------------------------------

        if (ret.file_url) {
          ret.file = ret.file_url;
          ret.image = ret.file_url;
        }

        // ------------------------------------------------------
        // ASSIGNED USERS NORMALIZATION
        // ------------------------------------------------------

        if (Array.isArray(ret.assigned_to)) {
          ret.assigned_to = ret.assigned_to.map((user) => {
            if (!user) return user;

            if (
              typeof user === 'object' &&
              (user._id || user.id)
            ) {
              const userId =
                user._id || user.id;

              const cleanUser = {
                ...user,
                id: userId.toString()
              };

              delete cleanUser._id;

              return cleanUser;
            }

            return user.toString();
          });
        }

        // ------------------------------------------------------
        // CLIENT NORMALIZATION
        // ------------------------------------------------------

        if (
          ret.client &&
          typeof ret.client === 'object' &&
          (ret.client._id || ret.client.id)
        ) {
          const clientId =
            ret.client._id || ret.client.id;

          ret.client = {
            ...ret.client,
            id: clientId.toString()
          };

          delete ret.client._id;
        } else if (ret.client) {
          ret.client = ret.client.toString();
        }

        // ------------------------------------------------------
        // PROJECT NORMALIZATION
        // ------------------------------------------------------

        if (
          ret.project &&
          typeof ret.project === 'object' &&
          (ret.project._id || ret.project.id)
        ) {
          const projectId =
            ret.project._id || ret.project.id;

          ret.project = {
            ...ret.project,
            id: projectId.toString()
          };

          delete ret.project._id;
        } else if (ret.project) {
          ret.project = ret.project.toString();
        }

        // ------------------------------------------------------
        // SUBTASK NORMALIZATION
        // ------------------------------------------------------

        if (Array.isArray(ret.subtasks)) {
          ret.subtasks = ret.subtasks.map((st) => {
            if (!st) return st;

            const stObj =
              typeof st.toObject === 'function'
                ? st.toObject()
                : st;

            const stId = stObj._id
              ? stObj._id.toString()
              : stObj.id || '';

            let created_by = stObj.created_by;

            if (
              created_by &&
              typeof created_by === 'object' &&
              (created_by._id || created_by.id)
            ) {
              const createdById =
                created_by._id || created_by.id;

              created_by = {
                ...created_by,
                id: createdById.toString()
              };

              delete created_by._id;
            } else if (created_by) {
              created_by = created_by.toString();
            }

            let completed_by = stObj.completed_by;

            if (
              completed_by &&
              typeof completed_by === 'object' &&
              (completed_by._id || completed_by.id)
            ) {
              const completedById =
                completed_by._id || completed_by.id;

              completed_by = {
                ...completed_by,
                id: completedById.toString()
              };

              delete completed_by._id;
            } else if (completed_by) {
              completed_by = completed_by.toString();
            }

            const cleanSt = {
              ...stObj,
              id: stId,
              created_by,
              completed_by
            };

            delete cleanSt._id;

            return cleanSt;
          });
        }

        // ------------------------------------------------------
        // COMMENT NORMALIZATION
        // ------------------------------------------------------

        if (Array.isArray(ret.comments)) {
          ret.comments = ret.comments.map((comment) => {
            if (!comment) return comment;

            const cleanComment = {
              ...comment
            };

            // --------------------------------------------------
            // COMMENT ID
            // --------------------------------------------------

            if (cleanComment._id) {
              cleanComment.id =
                cleanComment._id.toString();
            } else if (!cleanComment.id) {
              cleanComment.id = '';
            }

            // --------------------------------------------------
            // AUTHOR
            // --------------------------------------------------

            if (
              cleanComment.author &&
              typeof cleanComment.author === 'object'
            ) {
              const authorId =
                cleanComment.author._id ||
                cleanComment.author.id;

              if (authorId) {
                cleanComment.author = {
                  ...cleanComment.author,
                  id: authorId.toString()
                };

                delete cleanComment.author._id;
              }
            } else if (cleanComment.author) {
              cleanComment.author =
                cleanComment.author.toString();
            }

            // --------------------------------------------------
            // COMMENT ATTACHMENTS
            // --------------------------------------------------

            if (Array.isArray(cleanComment.attachments)) {
              cleanComment.attachments =
                cleanComment.attachments.map((file) => {
                  if (!file) return file;

                  const cleanFile = {
                    ...file
                  };

                  if (cleanFile._id) {
                    cleanFile.id =
                      cleanFile._id.toString();

                    delete cleanFile._id;
                  }

                  return cleanFile;
                });
            }

            delete cleanComment._id;

            return cleanComment;
          });
        }

        // ------------------------------------------------------
        // CLEAN INTERNAL FIELDS
        // ------------------------------------------------------

        delete ret._id;
        delete ret.file_public_id;
        delete ret.__v;

        return ret;
      }
    }
  }
);

// ============================================================
// PERFORMANCE INDEXES
// ============================================================

taskSchema.index({
  assigned_to: 1,
  status: 1
});

taskSchema.index({
  created_by: 1
});

taskSchema.index({
  user_id: 1
});

taskSchema.index({
  createdAt: -1
});

// ============================================================
// COLLABORATION COMMENT INDEX
// ============================================================

taskSchema.index({
  'comments.author': 1,
  'comments.createdAt': -1
});

// ============================================================
// MODEL
// ============================================================

const Task = mongoose.model('Task', taskSchema);

export default Task;