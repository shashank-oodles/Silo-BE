import slugify from "slugify";
import prisma from "../lib/prisma.js";
import { sendTicketConfirmationEmail } from "../lib/emails/ticketConfirmation.js";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// export const createRequestForm = async (req, res, next) => {
//   try {
//     let { name, description, tags, reviewerId, autoReplyEnabled, autoReplyMessage, organization } = req.body;

//     if (!name ||  !organization) {
//       return res.status(400).json({ error: "Missing required field" });
//     }

//     if (typeof tags === "string") {
//       tags = [tags]; // defensive fallback
//     }

//     if (!Array.isArray(tags) || tags.length === 0) {
//       return res.status(400).json({
//         error: "`tags` must be a non-empty array"
//       });
//     }

//     if (!tags.every(tag => typeof tag === "string")) {
//       return res.status(400).json({
//         error: "Each tag must be a string"
//       });
//     }

//     const baseSlug = slugify(name, {
//       lower: true,
//       strict: true
//     });

//     let slug = baseSlug;
//     let counter = 1;

//     while (await prisma.requestForm.findUnique({ where: { slug } })) {
//       slug = `${baseSlug}-${counter++}`;
//     }

//     const requestForm = await prisma.requestForm.create({
//       data: {
//         name,
//         slug,
//         description,
//         tags,
//         autoReplyEnabled,
//         autoReplyMessage,
//         organization,
//         // reviewerId,
//         createdBy: req.supabaseUserId
//       }
//     });

//     return res.status(201).json({
//       id: requestForm.id,
//       slug: requestForm.slug,
//       publicUrl: `/request/${requestForm.slug}`
//     });

//   } catch (err) {
//     next(err);
//   }
// };

// export const submitPublicTicket = async (req, res, next) => {
//   try {
//     const { slug } = req.params;
//     const { email, description, attachments = [], extraFields = {} } = req.body;

//     if (!email || !description) {
//       return res.status(400).json({
//         error: "Email and description are required"
//       });
//     }

//     const requestForm = await prisma.requestForm.findUnique({
//       where: { slug }
//     });

//     if (!requestForm || !requestForm.isActive) {
//       return res.status(404).json({
//         error: "Request form not found or inactive"
//       });
//     }

//     const ticket = await prisma.ticket.create({
//       data: {
//         requestFormId: requestForm.id,
//         reviewerId: requestForm.reviewerId,
//         email,
//         description,
//         organization: requestForm.organization,
//         payload: {
//           attachments,
//           extraFields
//         },
//         status: "NEW"
//       }
//     });

//     if (requestForm.autoReplyEnabled && requestForm.autoReplyMessage) {
//       await prisma.ticketMessage.create({
//         data: {
//           ticketId: ticket.id,
//           senderType: "SYSTEM",
//           // messageType: "AUTO_REPLY",
//           message: requestForm.autoReplyMessage
//         }
//       });
//     }

//     // ---- (Optional but recommended) create first chat message ----
//     // await prisma.ticketMessage.create({
//     //   data: {
//     //     ticketId: ticket.id,
//     //     senderType: "EXTERNAL",
//     //     message: description,
//     //     attachments
//     //   }
//     // });
//     if (ticket) {
//       try {
//         await sendTicketConfirmationEmail({
//           to: email
//         });
//       } catch (err) {
//         console.error("Failed to send confirmation email:", err);
//       }
//     }

//     return res.status(201).json({
//       ticketId: ticket.id,
//       status: ticket.status,
//       message: "Ticket submitted successfully"
//     });

//   } catch (err) {
//     next(err);
//   }
// };

export const createRequestForm = async (req, res, next) => {
  try {
    let {
      name,
      description,
      tags,
      reviewerId, // not used yet
      autoReplyEnabled = false,
      autoReplyMessage = null,
      organization
    } = req.body;

    if (!name || !organization) {
      return res.status(400).json({
        error: "Missing required fields: name or organization"
      });
    }

    // Normalize tags
    if (typeof tags === "string") {
      tags = [tags];
    }

    if (!Array.isArray(tags) || tags.length === 0) {
      return res.status(400).json({
        error: "`tags` must be a non-empty array"
      });
    }

    if (!tags.every(tag => typeof tag === "string")) {
      return res.status(400).json({
        error: "Each tag must be a string"
      });
    }

    // Generate slug
    const baseSlug = slugify(name, {
      lower: true,
      strict: true
    });

    let slug = baseSlug;
    let counter = 1;

    // 🔁 Manual uniqueness check
    while (true) {
      const { data: existing, error } = await supabaseAdmin
        .from("RequestForm")
        .select("id")
        .eq("slug", slug)
        .maybeSingle();

      if (error) {
        return res.status(500).json({
          error: "Failed to check slug uniqueness"
        });
      }

      if (!existing) break;

      slug = `${baseSlug}-${counter++}`;
    }

    // Create request form
    const { data: requestForm, error: insertError } = await supabaseAdmin
      .from("RequestForm")
      .insert({
        name,
        slug,
        description,
        tags,
        autoReplyEnabled,
        autoReplyMessage: autoReplyEnabled ? autoReplyMessage : null,
        organization_id: organization,
        createdBy: req.supabaseUserId
      })
      .select()
      .single();

    if (insertError) {
      return res.status(500).json({
        error: "Failed to create request form",
        details: insertError.message
      });
    }

    return res.status(201).json({
      id: requestForm.id,
      slug: requestForm.slug,
      publicUrl: `/request/${requestForm.slug}`
    });

  } catch (err) {
    next(err);
  }
};

// export const updateFormReviewerId = async (req, res, next) => {
//   try {
//     const { formId, reviewerId } = req.body;

//     if (!formId || !reviewerId) {
//       return res.status(400).json({ error: "Missing required fields" });
//     }

//     const updatedForm = await prisma.requestForm.update({
//       where: { id: formId },
//       data: { reviewerId }
//     });

//     return res.status(200).json({
//       message: "Reviewer updated successfully",
//       form: updatedForm
//     });
//   } catch (err) {
//     next(err);
//   }
// }

// export const getFormReviewers = async (req, res, next) => {
//   try {
//     const { data, error } = await supabaseAdmin
//       .from("user")
//       .select("*")

//     const users = data.map(user => ({
//       id: user.id,
//       email: user.email,
//       name: user.name,
//       image: user.image ? user.image : null
//     }))

//     if (error) {
//       return res.status(500).json({ error: "Failed to fetch reviewers" });
//     }
//     return res.status(200).json({ reviewers: users });
//   } catch (error) {
//     return res.status(500).json({ error: "Failed to fetch reviewers" });
//   }
// }

export const updateFormReviewerId = async (req, res, next) => {
  try {
    const { formId, reviewerId } = req.body;

    if (!formId || !reviewerId) {
      return res.status(400).json({
        error: "formId and reviewerId are required"
      });
    }

    // Update with org-scope protection
    const { data: updatedForm, error } = await supabaseAdmin
      .from("RequestForm")
      .update({
        reviewerId
      })
      .eq("id", formId)
      .select()
      .single();

    if (error) {
      return res.status(500).json({
        error: "Failed to update reviewer",
        details: error.message
      });
    }

    if (!updatedForm) {
      return res.status(404).json({
        error: "Request form not found or unauthorized"
      });
    }

    return res.status(200).json({
      message: "Reviewer updated successfully",
      form: updatedForm
    });

  } catch (err) {
    next(err);
  }
};

// export const submitPublicTicket = async (req, res, next) => {
//   try {
//     const { slug } = req.params;
//     const { name, email, description, attachments = [] } = req.body;

//     if (!name || !email || !description) {
//       return res.status(400).json({
//         error: "Name, email, and description are required"
//       });
//     }

//     const requestForm = await prisma.requestForm.findUnique({
//       where: { slug }
//     });

//     if (!requestForm || !requestForm.isActive) {
//       return res.status(404).json({
//         error: "Request form not found or inactive"
//       });
//     }

//     if (!requestForm.organization || !requestForm.reviewerId) {
//       return res.status(500).json({
//         error: "Request form is misconfigured (missing organization or reviewer)"
//       });
//     }

//     const ticket = await prisma.ticket.create({
//       data: {
//         organizationId: requestForm.organization,

//         requestFormId: requestForm.id,
//         categoryId: null,

//         reviewerId: requestForm.reviewerId,
//         assignedTeamId: null,

//         userName: name,
//         email,
//         description,
//         payload: {
//           attachments
//         }
//       }
//     });

//     if (requestForm.autoReplyEnabled && requestForm.autoReplyMessage) {
//       await prisma.ticketMessage.create({
//         data: {
//           ticketId: ticket.id,
//           senderType: "SYSTEM",
//           message: requestForm.autoReplyMessage
//         }
//       });
//     }

//     try {
//       await sendTicketConfirmationEmail({ to: email });
//     } catch (err) {
//       console.error("Failed to send confirmation email:", err);
//     }

//     return res.status(201).json({
//       ticketId: ticket.id,
//       status: ticket.status,
//       message: "Ticket submitted successfully"
//     });

//   } catch (err) {
//     next(err);
//   }
// };

export const submitPublicTicket = async (req, res, next) => {
  try {
    const { slug } = req.params;
    const { name, email, description, note, attachments = [] } = req.body;

    if (!name || !email || !description) {
      return res.status(400).json({
        error: "Name, email, and description are required"
      });
    }

    // 1️⃣ Fetch request form by slug
    const { data: requestForm, error: formError } = await supabaseAdmin
      .from("RequestForm")
      .select("*")
      .eq("slug", slug)
      .maybeSingle();

    if (formError) {
      return res.status(500).json({
        error: "Failed to fetch request form"
      });
    }

    if (!requestForm || !requestForm.isActive) {
      return res.status(404).json({
        error: "Request form not found or inactive"
      });
    }

    if (!requestForm.organization_id || !requestForm.reviewerId) {
      return res.status(500).json({
        error: "Request form is misconfigured (missing organization or reviewer)"
      });
    }

    // 2️⃣ Create ticket
    const { data: ticket, error: ticketError } = await supabaseAdmin
      .from("Ticket")
      .insert({
        organization_id: requestForm.organization_id,

        requestFormId: requestForm.id,
        categoryId: null,

        reviewerId: requestForm.reviewerId,
        assignedTeamId: null,

        userName: name,
        email,
        description,
        note: note ?? null,

        workflowStatus: "OPEN",   // required
        reviewed: false,          // required

        payload: {
          attachments
        }
      })
      .select()
      .single();

    if (ticketError) {
      return res.status(500).json({
        error: "Failed to create ticket",
        details: ticketError.message
      });
    }

    // 3️⃣ Auto-reply (if enabled)
    if (requestForm.autoReplyEnabled && requestForm.autoReplyMessage) {
      await supabaseAdmin
        .from("TicketMessage")
        .insert({
          ticketId: ticket.id,
          senderType: "SYSTEM",
          message: requestForm.auto_reply_message
        });
    }

    // 4️⃣ Send confirmation email (non-blocking)
    try {
      await sendTicketConfirmationEmail({ to: email });
    } catch (err) {
      console.error("Failed to send confirmation email:", err);
    }

    return res.status(201).json({
      ticketId: ticket.id,
      workflowStatus: ticket.workflowStatus,
      message: "Ticket submitted successfully"
    });

  } catch (err) {
    next(err);
  }
};

export const getFormReviewers = async (req, res, next) => {
  try {
    const { organizationId } = req.params;

    if (!organizationId) {
      return res.status(400).json({
        error: "organizationId is required"
      });
    }

    const { data: members, error: memberError } = await supabaseAdmin
      .from("member")
      .select("user_id")
      .eq("organization_id", organizationId);

    if (memberError) {
      return res.status(500).json({
        error: "Failed to fetch organization members"
      });
    }

    if (!members || members.length === 0) {
      return res.status(200).json({ reviewers: [] });
    }

    const userIds = members.map(m => m.user_id);

    const { data: users, error: userError } = await supabaseAdmin
      .from("user")
      .select("id, email, name, image")
      .in("id", userIds);

    if (userError) {
      return res.status(500).json({
        error: "Failed to fetch user details"
      });
    }

    const reviewers = users.map(user => ({
      id: user.id,
      email: user.email,
      name: user.name,
      image: user.image ?? null
    }));

    return res.status(200).json({ reviewers });

  } catch (err) {
    next(err);
  }
};

// export const getRequestFormsByOrganization = async (req, res, next) => {
//   try {
//     const { organizationId } = req.params;

//     if (!organizationId) {
//       return res.status(400).json({
//         error: "Organization context missing"
//       });
//     }

//     const forms = await prisma.requestForm.findMany({
//       where: {
//         organization: organizationId,
//         isActive: true
//       },
//       orderBy: {
//         createdAt: "desc"
//       },
//       select: {
//         id: true,
//         name: true,
//         slug: true,
//         tags: true,
//         isActive: true,
//         autoReplyEnabled: true,
//         autoReplyMessage: true,
//         reviewerId: true,
//         createdAt: true,
//         updatedAt: true
//       }
//     });

//     if (forms.length === 0) {
//       return res.status(200).json({ requestForms: [] });
//     }

//     const reviewerIds = [
//       ...new Set(forms.map(f => f.reviewerId).filter(Boolean))
//     ];

//     let reviewersMap = {};

//     if (reviewerIds.length > 0) {
//       const { data: reviewers, error } = await supabaseAdmin
//         .from("user")
//         .select("id, email, name, image")
//         .in("id", reviewerIds);

//       if (error) {
//         return res.status(500).json({
//           error: "Failed to fetch reviewer details"
//         });
//       }

//       reviewersMap = reviewers.reduce((acc, user) => {
//         acc[user.id] = {
//           id: user.id,
//           email: user.email,
//           name: user.name,
//           image: user.image ?? null
//         };
//         return acc;
//       }, {});
//     }

//     const enrichedForms = forms.map(form => ({
//       ...form,
//       reviewer: form.reviewerId
//         ? reviewersMap[form.reviewerId] || null
//         : null
//     }));

//     return res.status(200).json({
//       requestForms: enrichedForms
//     });

//   } catch (err) {
//     next(err);
//   }
// };

export const getRequestFormsByOrganization = async (req, res, next) => {
  try {
    const { organizationId } = req.params;

    if (!organizationId) {
      return res.status(400).json({
        error: "Organization context missing"
      });
    }

    // 1️⃣ Fetch request forms
    const { data: forms, error: formsError } = await supabaseAdmin
      .from("RequestForm")
      .select(`
        id,
        name,
        slug,
        tags,
        isActive,
        autoReplyEnabled,
        autoReplyMessage,
        reviewerId,
        created_at,
        updated_at
      `)
      .eq("organization_id", organizationId)
      .eq("isActive", true)
      .order("created_at", { ascending: false });

    if (formsError) {
      return res.status(500).json({
        error: "Failed to fetch request forms"
      });
    }

    if (!forms || forms.length === 0) {
      return res.status(200).json({ requestForms: [] });
    }

    // 2️⃣ Collect reviewer IDs
    const reviewerIds = [
      ...new Set(forms.map(f => f.reviewerId).filter(Boolean))
    ];

    let reviewersMap = {};

    // 3️⃣ Fetch reviewer details (Supabase user table)
    if (reviewerIds.length > 0) {
      const { data: reviewers, error: reviewersError } = await supabaseAdmin
        .from("user")
        .select("id, email, name, image")
        .in("id", reviewerIds);

      if (reviewersError) {
        return res.status(500).json({
          error: "Failed to fetch reviewer details"
        });
      }

      reviewersMap = reviewers.reduce((acc, user) => {
        acc[user.id] = {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image ?? null
        };
        return acc;
      }, {});
    }

    // 4️⃣ Enrich forms with reviewer object
    const enrichedForms = forms.map(form => ({
      id: form.id,
      name: form.name,
      slug: form.slug,
      tags: form.tags,
      isActive: form.is_active,
      autoReplyEnabled: form.auto_reply_enabled,
      autoReplyMessage: form.auto_reply_message,
      createdAt: form.created_at,
      updatedAt: form.updated_at,
      reviewerId: form.reviewerId,
      reviewer: form.reviewerId
        ? reviewersMap[form.reviewerId] || null
        : null
    }));

    return res.status(200).json({
      requestForms: enrichedForms
    });

  } catch (err) {
    next(err);
  }
};

// export const updateRequestForm = async (req, res, next) => {
//   try {
//     const { formId, organizationId } = req.params;
//     const {
//       name,
//       description,
//       tags,
//       reviewerId,
//       autoReplyEnabled,
//       autoReplyMessage,
//       isActive
//     } = req.body;

//     if (!formId) {
//       return res.status(400).json({ error: "formId is required" });
//     }

//     const existingForm = await prisma.requestForm.findUnique({
//       where: { id: formId }
//     });

//     if (!existingForm) {
//       return res.status(404).json({ error: "Request form not found" });
//     }

//     console.log('Existing Form:', existingForm);

//     if (existingForm.organization !== organizationId) {
//       return res.status(403).json({ error: "Unauthorized" });
//     }

//     const updateData = {};

//     if (name && name !== existingForm.name) {
//       updateData.name = name;

//       // updateData.slug = slugify(name, { lower: true, strict: true });
//     }

//     if (description !== undefined) updateData.description = description;
//     if (tags !== undefined) updateData.tags = tags;
//     if (reviewerId !== undefined) updateData.reviewerId = reviewerId;
//     if (isActive !== undefined) updateData.isActive = isActive;

//     if (autoReplyEnabled !== undefined) {
//       updateData.autoReplyEnabled = autoReplyEnabled;
//       updateData.autoReplyMessage = autoReplyEnabled
//         ? autoReplyMessage ?? existingForm.autoReplyMessage
//         : null;
//     }

//     const updatedForm = await prisma.requestForm.update({
//       where: { id: formId },
//       data: updateData
//     });

//     return res.status(200).json({
//       message: "Request form updated successfully",
//       form: updatedForm
//     });

//   } catch (err) {
//     next(err);
//   }
// };

export const updateRequestForm = async (req, res, next) => {
  try {
    const { formId, organizationId } = req.params;
    const {
      name,
      description,
      tags,
      reviewerId,
      autoReplyEnabled,
      autoReplyMessage,
      isActive
    } = req.body;

    if (!formId || !organizationId) {
      return res.status(400).json({
        error: "formId and organizationId are required"
      });
    }

    // 1️⃣ Fetch existing form (org-scoped)
    const { data: existingForm, error: fetchError } = await supabaseAdmin
      .from("RequestForm")
      .select("*")
      .eq("id", formId)
      // .eq("organization_id", organizationId)
      .maybeSingle();

    if (fetchError) {
      return res.status(500).json({
        error: "Failed to fetch request form"
      });
    }

    if (!existingForm) {
      return res.status(404).json({
        error: "Request form not found or unauthorized"
      });
    }

    // 2️⃣ Build update payload
    const updateData = {};

    if (name && name !== existingForm.name) {
      updateData.name = name;
      // slug intentionally NOT updated
    }

    if (description !== undefined) updateData.description = description;
    if (tags !== undefined) updateData.tags = tags;
    if (reviewerId !== undefined) updateData.reviewerId = reviewerId;
    if (isActive !== undefined) updateData.is_active = isActive;

    if (autoReplyEnabled !== undefined) {
      updateData.auto_reply_enabled = autoReplyEnabled;
      updateData.auto_reply_message = autoReplyEnabled
        ? autoReplyMessage ?? existingForm.auto_reply_message
        : null;
    }

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({
        error: "No valid fields provided for update"
      });
    }

    // 3️⃣ Perform update
    const { data: updatedForm, error: updateError } = await supabaseAdmin
      .from("RequestForm")
      .update(updateData)
      .eq("id", formId)
      .eq("organization_id", organizationId)
      .select()
      .single();

    if (updateError) {
      return res.status(500).json({
        error: "Failed to update request form",
        details: updateError.message
      });
    }

    return res.status(200).json({
      message: "Request form updated successfully",
      form: updatedForm
    });

  } catch (err) {
    next(err);
  }
};

// export const deleteRequestForm = async (req, res, next) => {
//   try {
//     const { formId, organizationId } = req.params;

//     if (!formId) {
//       return res.status(400).json({ error: "formId is required" });
//     }

//     const form = await prisma.requestForm.findUnique({
//       where: { id: formId }
//     });

//     if (!form) {
//       return res.status(404).json({ error: "Request form not found" });
//     }

//     if (form.organization !== organizationId) {
//       return res.status(403).json({ error: "Unauthorized" });
//     }

//     await prisma.requestForm.update({
//       where: { id: formId },
//       data: {
//         isActive: false
//       }
//     });

//     return res.status(200).json({
//       message: "Request form disabled successfully"
//     });

//   } catch (err) {
//     next(err);
//   }
// };

export const deleteRequestForm = async (req, res, next) => {
  try {
    const { formId, organizationId } = req.params;

    if (!formId || !organizationId) {
      return res.status(400).json({
        error: "formId and organizationId are required"
      });
    }

    // Soft delete (disable form) with org-scope protection
    const { data: updatedForm, error } = await supabaseAdmin
      .from("RequestForm")
      .update({
        isActive: false
      })
      .eq("id", formId)
      .eq("organization_id", organizationId)
      .select("id")
      .single();

    if (error) {
      return res.status(500).json({
        error: "Failed to disable request form",
        details: error.message
      });
    }

    if (!updatedForm) {
      return res.status(404).json({
        error: "Request form not found or unauthorized"
      });
    }

    return res.status(200).json({
      message: "Request form disabled successfully"
    });

  } catch (err) {
    next(err);
  }
};
