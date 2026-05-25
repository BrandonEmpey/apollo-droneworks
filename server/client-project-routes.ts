import express from "express";
import { storage } from "./storage";
import { db } from "./db";
import { customers } from "@shared/schema";
import { eq } from "drizzle-orm";
import fs from "fs";
import path from "path";
import { 
  clientProjects, 
  projectMilestones,
  projectTasks,
  taskFiles,
  taskMessages,
  timelapseItems,
  insertClientProjectSchema, 
  insertProjectMilestoneSchema,
  insertProjectTaskSchema,
  insertTaskFileSchema,
  insertTaskMessageSchema,
  insertTimelapseItemSchema
} from "@shared/schema";

export function registerClientProjectRoutes(app: express.Express) {
  // Get all client projects
  app.get("/api/client-projects", async (req, res) => {
    try {
      if (req.isAuthenticated()) {
        if (req.user.isAdmin) {
          // Admin gets all projects
          const projects = await storage.getAllClientProjects();
          return res.json(projects);
        } else {
          // Regular users only get their own projects
          const projects = await storage.getClientProjectsByClientId(req.user.id);
          return res.json(projects);
        }
      } else {
        return res.status(401).send("Unauthorized");
      }
    } catch (error) {
      console.error("Error fetching client projects:", error);
      res.status(500).send("Internal Server Error");
    }
  });

  // Get client projects by client ID
  app.get("/api/client-projects/client/:clientId", async (req, res) => {
    try {
      if (req.isAuthenticated()) {
        const clientId = parseInt(req.params.clientId);
        
        // Regular users can only see their own projects
        if (!req.user.isAdmin && req.user.id !== clientId) {
          return res.status(403).send("Forbidden");
        }
        
        const projects = await storage.getClientProjectsByClientId(clientId);
        return res.json(projects);
      } else {
        return res.status(401).send("Unauthorized");
      }
    } catch (error) {
      console.error("Error fetching client projects by clientId:", error);
      res.status(500).send("Internal Server Error");
    }
  });

  // Get a specific client project
  app.get("/api/client-projects/:id", async (req, res) => {
    try {
      if (req.isAuthenticated()) {
        const projectId = parseInt(req.params.id);
        const project = await storage.getClientProject(projectId);
        
        if (!project) {
          return res.status(404).send("Project not found");
        }
        
        // Regular users can only see their own projects
        if (!req.user.isAdmin && project.clientId !== req.user.id) {
          return res.status(403).send("Forbidden");
        }
        
        return res.json(project);
      } else {
        return res.status(401).send("Unauthorized");
      }
    } catch (error) {
      console.error("Error fetching client project:", error);
      res.status(500).send("Internal Server Error");
    }
  });

  // Create a new client project
  app.post("/api/client-projects", async (req, res) => {
    try {
      if (req.isAuthenticated()) {
        let clientId = req.body.clientId ? parseInt(req.body.clientId) : null;

        if (!clientId) {
          if (req.user.isAdmin) {
            return res.status(400).json({ message: "Please select a client for this project." });
          }
          // For regular users, resolve their customers record
          const [customerRecord] = await db.select({ id: customers.id })
            .from(customers)
            .where(eq(customers.userId, req.user.id))
            .limit(1);
          if (!customerRecord) {
            return res.status(400).json({ message: "No customer profile found for your account. Please contact support." });
          }
          clientId = customerRecord.id;
        }

        // Regular users can only create projects for themselves
        if (!req.user.isAdmin) {
          const [customerRecord] = await db.select({ id: customers.id })
            .from(customers)
            .where(eq(customers.userId, req.user.id))
            .limit(1);
          if (!customerRecord || customerRecord.id !== clientId) {
            return res.status(403).send("Forbidden");
          }
        }

        const validatedData = insertClientProjectSchema.parse({
          ...req.body,
          clientId
        });
        
        const project = await storage.createClientProject(validatedData);
        
        // If there's a serviceId, fetch the service to get process steps
        if (project.serviceId) {
          try {
            const service = await storage.getService(project.serviceId);
            
            if (service && service.processSteps && Array.isArray(service.processSteps)) {
              // Create tasks from process steps
              const taskPromises = service.processSteps.map(async (step: { title: string, description: string }, index: number) => {
                const taskData = {
                  projectId: project.id,
                  title: step.title,
                  description: step.description,
                  status: "todo",
                  priority: "medium",
                  dueDate: new Date(Date.now() + (7 + index * 3) * 24 * 60 * 60 * 1000), // Staggered due dates
                };
                
                return storage.createProjectTask(taskData);
              });
              
              await Promise.all(taskPromises);
              console.log(`Created ${service.processSteps.length} tasks for project ${project.id} based on service ${service.name}`);
            }
          } catch (serviceError) {
            console.error("Error generating tasks from service:", serviceError);
            // Continue with project creation even if task generation fails
          }
        }
        
        return res.status(201).json(project);
      } else {
        return res.status(401).send("Unauthorized");
      }
    } catch (error) {
      console.error("Error creating client project:", error);
      res.status(500).send("Internal Server Error");
    }
  });

  // Update a client project
  app.put("/api/client-projects/:id", async (req, res) => {
    try {
      if (req.isAuthenticated()) {
        const projectId = parseInt(req.params.id);
        const project = await storage.getClientProject(projectId);
        
        if (!project) {
          return res.status(404).send("Project not found");
        }
        
        // Regular users can only update their own projects
        if (!req.user.isAdmin && project.clientId !== req.user.id) {
          return res.status(403).send("Forbidden");
        }

        const payload: Record<string, unknown> = { ...(req.body || {}) };

        // `shareableLink` (Task #145) is admin-only and must be a valid
        // https URL or explicitly cleared. Non-admins can never write it
        // even if they own the project, since it is the single delivery
        // channel for every "link"-method deliverable.
        if ('shareableLink' in payload) {
          if (!req.user.isAdmin) {
            return res.status(403).send("Only admins can set the project shareable link");
          }
          const raw = payload.shareableLink;
          if (raw === null || raw === '' || raw === undefined) {
            payload.shareableLink = null;
          } else if (typeof raw === 'string') {
            const trimmed = raw.trim();
            try {
              const parsed = new URL(trimmed);
              if (parsed.protocol !== 'https:') {
                return res.status(400).json({ message: "shareableLink must use https" });
              }
              payload.shareableLink = parsed.toString();
            } catch {
              return res.status(400).json({ message: "shareableLink is not a valid URL" });
            }
          } else {
            return res.status(400).json({ message: "shareableLink must be a string" });
          }
        }

        const updatedProject = await storage.updateClientProject(projectId, payload);
        return res.json(updatedProject);
      } else {
        return res.status(401).send("Unauthorized");
      }
    } catch (error) {
      console.error("Error updating client project:", error);
      res.status(500).send("Internal Server Error");
    }
  });

  // Delete a client project
  app.delete("/api/client-projects/:id", async (req, res) => {
    try {
      if (req.isAuthenticated()) {
        const projectId = parseInt(req.params.id);
        const project = await storage.getClientProject(projectId);
        
        if (!project) {
          return res.status(404).send("Project not found");
        }
        
        // Regular users can only delete their own projects
        if (!req.user.isAdmin && project.clientId !== req.user.id) {
          return res.status(403).send("Forbidden");
        }
        
        await storage.deleteClientProject(projectId);
        return res.status(204).send();
      } else {
        return res.status(401).send("Unauthorized");
      }
    } catch (error) {
      console.error("Error deleting client project:", error);
      res.status(500).send("Internal Server Error");
    }
  });

  // MILESTONE MANAGEMENT ENDPOINTS
  
  // Get milestones for a project
  app.get("/api/client-projects/:projectId/milestones", async (req, res) => {
    try {
      if (req.isAuthenticated()) {
        const projectId = parseInt(req.params.projectId);
        const project = await storage.getClientProject(projectId);
        
        if (!project) {
          return res.status(404).send("Project not found");
        }
        
        // Regular users can only see milestones for their own projects
        if (!req.user.isAdmin && project.clientId !== req.user.id) {
          return res.status(403).send("Forbidden");
        }
        
        const milestones = await storage.getProjectMilestones(projectId);
        return res.json(milestones);
      } else {
        return res.status(401).send("Unauthorized");
      }
    } catch (error) {
      console.error("Error fetching project milestones:", error);
      res.status(500).send("Internal Server Error");
    }
  });
  
  // Get a specific milestone
  app.get("/api/client-projects/:projectId/milestones/:milestoneId", async (req, res) => {
    try {
      if (req.isAuthenticated()) {
        const projectId = parseInt(req.params.projectId);
        const milestoneId = parseInt(req.params.milestoneId);
        
        const project = await storage.getClientProject(projectId);
        if (!project) {
          return res.status(404).send("Project not found");
        }
        
        // Regular users can only see milestones for their own projects
        if (!req.user.isAdmin && project.clientId !== req.user.id) {
          return res.status(403).send("Forbidden");
        }
        
        const milestone = await storage.getProjectMilestone(milestoneId);
        if (!milestone) {
          return res.status(404).send("Milestone not found");
        }
        
        // Verify milestone belongs to the specified project
        if (milestone.projectId !== projectId) {
          return res.status(404).send("Milestone not found in this project");
        }
        
        return res.json(milestone);
      } else {
        return res.status(401).send("Unauthorized");
      }
    } catch (error) {
      console.error("Error fetching milestone:", error);
      res.status(500).send("Internal Server Error");
    }
  });
  
  // Create a new milestone
  app.post("/api/client-projects/:projectId/milestones", async (req, res) => {
    try {
      if (req.isAuthenticated()) {
        const projectId = parseInt(req.params.projectId);
        const project = await storage.getClientProject(projectId);
        
        if (!project) {
          return res.status(404).send("Project not found");
        }
        
        // Regular users can only add milestones to their own projects
        if (!req.user.isAdmin && project.clientId !== req.user.id) {
          return res.status(403).send("Forbidden");
        }
        
        // Validate the milestone data
        const milestoneData = insertProjectMilestoneSchema.parse({
          ...req.body,
          projectId
        });
        
        // Create the milestone
        const milestone = await storage.createProjectMilestone(milestoneData);
        return res.status(201).json(milestone);
      } else {
        return res.status(401).send("Unauthorized");
      }
    } catch (error) {
      console.error("Error creating milestone:", error);
      res.status(500).send("Internal Server Error");
    }
  });
  
  // Update a milestone
  app.put("/api/client-projects/:projectId/milestones/:milestoneId", async (req, res) => {
    try {
      if (req.isAuthenticated()) {
        const projectId = parseInt(req.params.projectId);
        const milestoneId = parseInt(req.params.milestoneId);
        
        const project = await storage.getClientProject(projectId);
        if (!project) {
          return res.status(404).send("Project not found");
        }
        
        // Regular users can only update milestones in their own projects
        if (!req.user.isAdmin && project.clientId !== req.user.id) {
          return res.status(403).send("Forbidden");
        }
        
        const milestone = await storage.getProjectMilestone(milestoneId);
        if (!milestone) {
          return res.status(404).send("Milestone not found");
        }
        
        // Verify milestone belongs to the specified project
        if (milestone.projectId !== projectId) {
          return res.status(404).send("Milestone not found in this project");
        }
        
        // Update the milestone
        const updatedMilestone = await storage.updateProjectMilestone(milestoneId, req.body);
        return res.json(updatedMilestone);
      } else {
        return res.status(401).send("Unauthorized");
      }
    } catch (error) {
      console.error("Error updating milestone:", error);
      res.status(500).send("Internal Server Error");
    }
  });
  
  // Delete a milestone
  app.delete("/api/client-projects/:projectId/milestones/:milestoneId", async (req, res) => {
    try {
      if (req.isAuthenticated()) {
        const projectId = parseInt(req.params.projectId);
        const milestoneId = parseInt(req.params.milestoneId);
        
        const project = await storage.getClientProject(projectId);
        if (!project) {
          return res.status(404).send("Project not found");
        }
        
        // Regular users can only delete milestones in their own projects
        if (!req.user.isAdmin && project.clientId !== req.user.id) {
          return res.status(403).send("Forbidden");
        }
        
        const milestone = await storage.getProjectMilestone(milestoneId);
        if (!milestone) {
          return res.status(404).send("Milestone not found");
        }
        
        // Verify milestone belongs to the specified project
        if (milestone.projectId !== projectId) {
          return res.status(404).send("Milestone not found in this project");
        }
        
        // Delete the milestone
        const success = await storage.deleteProjectMilestone(milestoneId);
        if (!success) {
          return res.status(500).send("Failed to delete milestone");
        }
        
        return res.status(204).send();
      } else {
        return res.status(401).send("Unauthorized");
      }
    } catch (error) {
      console.error("Error deleting milestone:", error);
      res.status(500).send("Internal Server Error");
    }
  });

  // TASK MANAGEMENT ENDPOINTS
  
  // Get tasks for a project
  app.get("/api/client-projects/:projectId/tasks", async (req, res) => {
    try {
      if (req.isAuthenticated()) {
        const projectId = parseInt(req.params.projectId);
        const project = await storage.getClientProject(projectId);
        
        if (!project) {
          return res.status(404).send("Project not found");
        }
        
        // Regular users can only see tasks for their own projects
        if (!req.user.isAdmin && project.clientId !== req.user.id) {
          return res.status(403).send("Forbidden");
        }
        
        const tasks = await storage.getProjectTasks(projectId);
        return res.json(tasks);
      } else {
        return res.status(401).send("Unauthorized");
      }
    } catch (error) {
      console.error("Error fetching project tasks:", error);
      res.status(500).send("Internal Server Error");
    }
  });
  
  // Get a specific task
  app.get("/api/client-projects/:projectId/tasks/:taskId", async (req, res) => {
    try {
      if (req.isAuthenticated()) {
        const projectId = parseInt(req.params.projectId);
        const taskId = parseInt(req.params.taskId);
        
        const project = await storage.getClientProject(projectId);
        if (!project) {
          return res.status(404).send("Project not found");
        }
        
        // Regular users can only see tasks for their own projects
        if (!req.user.isAdmin && project.clientId !== req.user.id) {
          return res.status(403).send("Forbidden");
        }
        
        const task = await storage.getProjectTask(taskId);
        if (!task) {
          return res.status(404).send("Task not found");
        }
        
        // Verify task belongs to the specified project
        if (task.projectId !== projectId) {
          return res.status(404).send("Task not found in this project");
        }
        
        return res.json(task);
      } else {
        return res.status(401).send("Unauthorized");
      }
    } catch (error) {
      console.error("Error fetching task:", error);
      res.status(500).send("Internal Server Error");
    }
  });
  
  // Create a new task
  app.post("/api/client-projects/:projectId/tasks", async (req, res) => {
    try {
      if (req.isAuthenticated()) {
        const projectId = parseInt(req.params.projectId);
        const project = await storage.getClientProject(projectId);
        
        if (!project) {
          return res.status(404).send("Project not found");
        }
        
        // Regular users can only add tasks to their own projects
        if (!req.user.isAdmin && project.clientId !== req.user.id) {
          return res.status(403).send("Forbidden");
        }
        
        // Validate the task data
        const taskData = insertProjectTaskSchema.parse({
          ...req.body,
          projectId
        });
        
        // Create the task
        const task = await storage.createProjectTask(taskData);
        return res.status(201).json(task);
      } else {
        return res.status(401).send("Unauthorized");
      }
    } catch (error) {
      console.error("Error creating task:", error);
      res.status(500).send("Internal Server Error");
    }
  });
  
  // Update a task
  app.put("/api/client-projects/:projectId/tasks/:taskId", async (req, res) => {
    try {
      if (req.isAuthenticated()) {
        const projectId = parseInt(req.params.projectId);
        const taskId = parseInt(req.params.taskId);
        
        const project = await storage.getClientProject(projectId);
        if (!project) {
          return res.status(404).send("Project not found");
        }
        
        // Regular users can only update tasks in their own projects
        if (!req.user.isAdmin && project.clientId !== req.user.id) {
          return res.status(403).send("Forbidden");
        }
        
        const task = await storage.getProjectTask(taskId);
        if (!task) {
          return res.status(404).send("Task not found");
        }
        
        // Verify task belongs to the specified project
        if (task.projectId !== projectId) {
          return res.status(404).send("Task not found in this project");
        }
        
        // Update the task
        const updatedTask = await storage.updateProjectTask(taskId, req.body);
        return res.json(updatedTask);
      } else {
        return res.status(401).send("Unauthorized");
      }
    } catch (error) {
      console.error("Error updating task:", error);
      res.status(500).send("Internal Server Error");
    }
  });
  
  // Delete a task
  app.delete("/api/client-projects/:projectId/tasks/:taskId", async (req, res) => {
    try {
      if (req.isAuthenticated()) {
        const projectId = parseInt(req.params.projectId);
        const taskId = parseInt(req.params.taskId);
        
        const project = await storage.getClientProject(projectId);
        if (!project) {
          return res.status(404).send("Project not found");
        }
        
        // Regular users can only delete tasks in their own projects
        if (!req.user.isAdmin && project.clientId !== req.user.id) {
          return res.status(403).send("Forbidden");
        }
        
        const task = await storage.getProjectTask(taskId);
        if (!task) {
          return res.status(404).send("Task not found");
        }
        
        // Verify task belongs to the specified project
        if (task.projectId !== projectId) {
          return res.status(404).send("Task not found in this project");
        }
        
        // Delete the task
        const success = await storage.deleteProjectTask(taskId);
        if (!success) {
          return res.status(500).send("Failed to delete task");
        }
        
        return res.status(204).send();
      } else {
        return res.status(401).send("Unauthorized");
      }
    } catch (error) {
      console.error("Error deleting task:", error);
      res.status(500).send("Internal Server Error");
    }
  });
  
  // TASK FILES ENDPOINTS
  
  // Get files for a task
  app.get("/api/client-projects/:projectId/tasks/:taskId/files", async (req, res) => {
    try {
      if (req.isAuthenticated()) {
        const projectId = parseInt(req.params.projectId);
        const taskId = parseInt(req.params.taskId);
        
        const project = await storage.getClientProject(projectId);
        if (!project) {
          return res.status(404).send("Project not found");
        }
        
        // Regular users can only see files for tasks in their own projects
        if (!req.user.isAdmin && project.clientId !== req.user.id) {
          return res.status(403).send("Forbidden");
        }
        
        const task = await storage.getProjectTask(taskId);
        if (!task) {
          return res.status(404).send("Task not found");
        }
        
        // Verify task belongs to the specified project
        if (task.projectId !== projectId) {
          return res.status(404).send("Task not found in this project");
        }
        
        const files = await storage.getTaskFiles(taskId);
        return res.json(files);
      } else {
        return res.status(401).send("Unauthorized");
      }
    } catch (error) {
      console.error("Error fetching task files:", error);
      res.status(500).send("Internal Server Error");
    }
  });
  
  // Add file to a task
  app.post("/api/client-projects/:projectId/tasks/:taskId/files", async (req, res) => {
    try {
      if (req.isAuthenticated()) {
        const projectId = parseInt(req.params.projectId);
        const taskId = parseInt(req.params.taskId);
        
        const project = await storage.getClientProject(projectId);
        if (!project) {
          return res.status(404).send("Project not found");
        }
        
        // Regular users can only add files to tasks in their own projects
        if (!req.user.isAdmin && project.clientId !== req.user.id) {
          return res.status(403).send("Forbidden");
        }
        
        const task = await storage.getProjectTask(taskId);
        if (!task) {
          return res.status(404).send("Task not found");
        }
        
        // Verify task belongs to the specified project
        if (task.projectId !== projectId) {
          return res.status(404).send("Task not found in this project");
        }
        
        // Auto-detect file type based on URL extension or user input
        let fileType = req.body.fileType || "link";
        const url = req.body.url;
        
        if (!fileType || fileType === "link") {
          // Simple auto-detection of file type based on URL extension
          if (url.match(/\.(jpeg|jpg|png|gif|webp|svg)$/i)) {
            fileType = "image";
          } else if (url.match(/\.(mp4|webm|avi|mov|wmv)$/i)) {
            fileType = "video";
          } else if (url.match(/\.(pdf|doc|docx|xls|xlsx|ppt|pptx|txt)$/i)) {
            fileType = "document";
          }
        }
        
        // Validate the file data
        const fileData = insertTaskFileSchema.parse({
          taskId,
          name: req.body.name,
          url: url,
          fileType: fileType
        });
        
        // Create the task file
        const file = await storage.createTaskFile(fileData);
        return res.status(201).json(file);
      } else {
        return res.status(401).send("Unauthorized");
      }
    } catch (error) {
      console.error("Error adding file to task:", error);
      res.status(500).send("Internal Server Error");
    }
  });
  
  // Delete a task file
  app.delete("/api/client-projects/:projectId/tasks/:taskId/files/:fileId", async (req, res) => {
    try {
      if (req.isAuthenticated()) {
        const projectId = parseInt(req.params.projectId);
        const taskId = parseInt(req.params.taskId);
        const fileId = parseInt(req.params.fileId);
        
        const project = await storage.getClientProject(projectId);
        if (!project) {
          return res.status(404).send("Project not found");
        }
        
        // Regular users can only delete files from tasks in their own projects
        if (!req.user.isAdmin && project.clientId !== req.user.id) {
          return res.status(403).send("Forbidden");
        }
        
        const task = await storage.getProjectTask(taskId);
        if (!task) {
          return res.status(404).send("Task not found");
        }
        
        // Verify task belongs to the specified project
        if (task.projectId !== projectId) {
          return res.status(404).send("Task not found in this project");
        }
        
        // Delete the file
        const success = await storage.deleteTaskFile(fileId);
        if (!success) {
          return res.status(500).send("Failed to delete file");
        }
        
        return res.status(204).send();
      } else {
        return res.status(401).send("Unauthorized");
      }
    } catch (error) {
      console.error("Error deleting task file:", error);
      res.status(500).send("Internal Server Error");
    }
  });

  // TASK MESSAGES ENDPOINTS
  
  // Get messages for a task
  app.get("/api/client-projects/:projectId/tasks/:taskId/messages", async (req, res) => {
    try {
      if (req.isAuthenticated()) {
        const projectId = parseInt(req.params.projectId);
        const taskId = parseInt(req.params.taskId);
        
        const project = await storage.getClientProject(projectId);
        if (!project) {
          return res.status(404).send("Project not found");
        }
        
        // Regular users can only see messages for tasks in their own projects
        if (!req.user.isAdmin && project.clientId !== req.user.id) {
          return res.status(403).send("Forbidden");
        }
        
        const task = await storage.getProjectTask(taskId);
        if (!task) {
          return res.status(404).send("Task not found");
        }
        
        // Verify task belongs to the specified project
        if (task.projectId !== projectId) {
          return res.status(404).send("Task not found in this project");
        }
        
        const messages = await storage.getTaskMessages(taskId);
        return res.json(messages);
      } else {
        return res.status(401).send("Unauthorized");
      }
    } catch (error) {
      console.error("Error fetching task messages:", error);
      res.status(500).send("Internal Server Error");
    }
  });
  
  // Get a specific message
  app.get("/api/client-projects/:projectId/tasks/:taskId/messages/:messageId", async (req, res) => {
    try {
      if (req.isAuthenticated()) {
        const projectId = parseInt(req.params.projectId);
        const taskId = parseInt(req.params.taskId);
        const messageId = parseInt(req.params.messageId);
        
        const project = await storage.getClientProject(projectId);
        if (!project) {
          return res.status(404).send("Project not found");
        }
        
        // Regular users can only see messages for tasks in their own projects
        if (!req.user.isAdmin && project.clientId !== req.user.id) {
          return res.status(403).send("Forbidden");
        }
        
        const task = await storage.getProjectTask(taskId);
        if (!task) {
          return res.status(404).send("Task not found");
        }
        
        // Verify task belongs to the specified project
        if (task.projectId !== projectId) {
          return res.status(404).send("Task not found in this project");
        }
        
        const message = await storage.getTaskMessage(messageId);
        if (!message || message.taskId !== taskId) {
          return res.status(404).send("Message not found");
        }
        
        return res.json(message);
      } else {
        return res.status(401).send("Unauthorized");
      }
    } catch (error) {
      console.error("Error fetching task message:", error);
      res.status(500).send("Internal Server Error");
    }
  });
  
  // Send a new message for a task
  app.post("/api/client-projects/:projectId/tasks/:taskId/messages", async (req, res) => {
    try {
      if (req.isAuthenticated()) {
        const projectId = parseInt(req.params.projectId);
        const taskId = parseInt(req.params.taskId);
        
        const project = await storage.getClientProject(projectId);
        if (!project) {
          return res.status(404).send("Project not found");
        }
        
        // Regular users can only send messages for tasks in their own projects
        if (!req.user.isAdmin && project.clientId !== req.user.id) {
          return res.status(403).send("Forbidden");
        }
        
        const task = await storage.getProjectTask(taskId);
        if (!task) {
          return res.status(404).send("Task not found");
        }
        
        // Verify task belongs to the specified project
        if (task.projectId !== projectId) {
          return res.status(404).send("Task not found in this project");
        }
        
        // Validate the message data
        const messageData = insertTaskMessageSchema.parse({
          ...req.body,
          taskId,
          userId: req.user.id,
          status: 'sent'
        });
        
        // Create the message
        const message = await storage.createTaskMessage(messageData);
        
        // Here we would typically add email sending logic
        // For now, just return the created message
        
        return res.status(201).json(message);
      } else {
        return res.status(401).send("Unauthorized");
      }
    } catch (error) {
      console.error("Error sending task message:", error);
      res.status(500).send("Internal Server Error");
    }
  });
  
  // Update message status
  app.put("/api/client-projects/:projectId/tasks/:taskId/messages/:messageId/status", async (req, res) => {
    try {
      if (req.isAuthenticated() && req.user.isAdmin) {
        const projectId = parseInt(req.params.projectId);
        const taskId = parseInt(req.params.taskId);
        const messageId = parseInt(req.params.messageId);
        const { status } = req.body;
        
        if (!status || !['sent', 'delivered', 'failed'].includes(status)) {
          return res.status(400).send("Invalid status");
        }
        
        const project = await storage.getClientProject(projectId);
        if (!project) {
          return res.status(404).send("Project not found");
        }
        
        const task = await storage.getProjectTask(taskId);
        if (!task) {
          return res.status(404).send("Task not found");
        }
        
        // Verify task belongs to the specified project
        if (task.projectId !== projectId) {
          return res.status(404).send("Task not found in this project");
        }
        
        const message = await storage.getTaskMessage(messageId);
        if (!message || message.taskId !== taskId) {
          return res.status(404).send("Message not found");
        }
        
        // Update the message status
        const updatedMessage = await storage.updateTaskMessageStatus(messageId, status);
        return res.json(updatedMessage);
      } else {
        return res.status(401).send("Unauthorized");
      }
    } catch (error) {
      console.error("Error updating message status:", error);
      res.status(500).send("Internal Server Error");
    }
  });
  
  // Demo endpoint to get a list of sample files for testing
  app.get("/api/demo-files", async (req, res) => {
    try {
      // Create a list of demo files for testing the messaging feature
      const baseUrl = `${req.protocol}://${req.get('host')}`;
      const demoFiles = [
        {
          id: 1001,
          name: "Drone Specifications",
          url: `${baseUrl}/demo-files/drone-specs.txt`,
          fileType: "document",
          taskId: 3,
          uploadedAt: new Date()
        },
        {
          id: 1002,
          name: "Project Timeline",
          url: `${baseUrl}/demo-files/project-timeline.pdf`,
          fileType: "document",
          taskId: 3,
          uploadedAt: new Date()
        },
        {
          id: 1003,
          name: "Drone Photo Sample",
          url: "https://images.unsplash.com/photo-1527977966376-1c8408f9f108",
          fileType: "image",
          taskId: 3,
          uploadedAt: new Date()
        },
        {
          id: 1004,
          name: "Google Maps",
          url: "https://maps.google.com",
          fileType: "link",
          taskId: 3,
          uploadedAt: new Date()
        }
      ];
      
      return res.json(demoFiles);
    } catch (error) {
      console.error("Error serving demo files:", error);
      res.status(500).send("Internal Server Error");
    }
  });
  
  // Special demo endpoint to add demo files to a task
  app.post("/api/client-projects/:projectId/tasks/:taskId/demo-files", async (req, res) => {
    try {
      if (req.isAuthenticated()) {
        const projectId = parseInt(req.params.projectId);
        const taskId = parseInt(req.params.taskId);
        
        const project = await storage.getClientProject(projectId);
        if (!project) {
          return res.status(404).send("Project not found");
        }
        
        // Check if task exists
        const task = await storage.getProjectTask(taskId);
        if (!task || task.projectId !== projectId) {
          return res.status(404).send("Task not found in this project");
        }
        
        // Only admin or project owner can add files
        if (!req.user.isAdmin && project.clientId !== req.user.id) {
          return res.status(403).send("Forbidden");
        }
        
        // Get demo files and add them to the task
        const baseUrl = `${req.protocol}://${req.get('host')}`;
        const demoFiles = [
          {
            name: "Drone Specifications",
            url: `${baseUrl}/demo-files/drone-specs.txt`,
            fileType: "document",
            taskId: taskId
          },
          {
            name: "Project Timeline",
            url: `${baseUrl}/demo-files/project-timeline.pdf`, 
            fileType: "document",
            taskId: taskId
          },
          {
            name: "Drone Photo Sample",
            url: "https://images.unsplash.com/photo-1527977966376-1c8408f9f108",
            fileType: "image",
            taskId: taskId
          },
          {
            name: "Google Maps Location",
            url: "https://maps.google.com",
            fileType: "link",
            taskId: taskId
          }
        ];
        
        // Add files to the task
        const addedFiles = [];
        for (const fileData of demoFiles) {
          try {
            const file = await storage.createTaskFile(fileData);
            addedFiles.push(file);
          } catch (error) {
            console.error("Error adding demo file:", error);
            // Continue with other files even if one fails
          }
        }
        
        return res.status(201).json(addedFiles);
      } else {
        return res.status(401).send("Unauthorized");
      }
    } catch (error) {
      console.error("Error adding demo files to task:", error);
      res.status(500).send("Internal Server Error");
    }
  });

  // TIMELAPSE MANAGEMENT ENDPOINTS

  // Get all timelapse items for a project
  app.get("/api/client-projects/:projectId/timelapse", async (req, res) => {
    try {
      if (req.isAuthenticated()) {
        const projectId = parseInt(req.params.projectId);
        
        const project = await storage.getClientProject(projectId);
        if (!project) {
          return res.status(404).send("Project not found");
        }
        
        // Regular users can only see timelapse items for their own projects
        if (!req.user.isAdmin && project.clientId !== req.user.id) {
          return res.status(403).send("Forbidden");
        }
        
        const timelapseItems = await storage.getProjectTimelapseItems(projectId);
        return res.json(timelapseItems);
      } else {
        return res.status(401).send("Unauthorized");
      }
    } catch (error) {
      console.error("Error fetching project timelapse items:", error);
      res.status(500).send("Internal Server Error");
    }
  });

  // Get timelapse items for a task
  app.get("/api/client-projects/:projectId/tasks/:taskId/timelapse", async (req, res) => {
    try {
      if (req.isAuthenticated()) {
        const projectId = parseInt(req.params.projectId);
        const taskId = parseInt(req.params.taskId);
        
        const project = await storage.getClientProject(projectId);
        if (!project) {
          return res.status(404).send("Project not found");
        }
        
        // Regular users can only see timelapse items for their own projects
        if (!req.user.isAdmin && project.clientId !== req.user.id) {
          return res.status(403).send("Forbidden");
        }
        
        const task = await storage.getProjectTask(taskId);
        if (!task) {
          return res.status(404).send("Task not found");
        }
        
        // Verify task belongs to the specified project
        if (task.projectId !== projectId) {
          return res.status(404).send("Task not found in this project");
        }
        
        const timelapseItems = await storage.getTimelapseItems(taskId);
        return res.json(timelapseItems);
      } else {
        return res.status(401).send("Unauthorized");
      }
    } catch (error) {
      console.error("Error fetching timelapse items:", error);
      res.status(500).send("Internal Server Error");
    }
  });
  
  // Add timelapse item
  app.post("/api/client-projects/:projectId/tasks/:taskId/timelapse", async (req, res) => {
    try {
      if (req.isAuthenticated()) {
        const projectId = parseInt(req.params.projectId);
        const taskId = parseInt(req.params.taskId);
        
        const project = await storage.getClientProject(projectId);
        if (!project) {
          return res.status(404).send("Project not found");
        }
        
        // Regular users can only add timelapse items to tasks in their own projects
        if (!req.user.isAdmin && project.clientId !== req.user.id) {
          return res.status(403).send("Forbidden");
        }
        
        const task = await storage.getProjectTask(taskId);
        if (!task) {
          return res.status(404).send("Task not found");
        }
        
        // Verify task belongs to the specified project
        if (task.projectId !== projectId) {
          return res.status(404).send("Task not found in this project");
        }
        
        // Auto-detect media type based on URL extension or user input
        let mediaType = req.body.mediaType || "image";
        const url = req.body.url;
        const sourceType = req.body.sourceType || "url";
        
        if (!mediaType) {
          // Simple auto-detection of media type based on URL extension
          if (url.match(/\.(jpeg|jpg|png|gif|webp|svg)$/i)) {
            mediaType = "image";
          } else if (url.match(/\.(mp4|webm|avi|mov|wmv)$/i)) {
            mediaType = "video";
          } else if (url.match(/\.(obj|glb|gltf)$/i)) {
            mediaType = "orthomosaic";
          }
        }
        
        // Validate and prepare the timelapse item data
        const timelapseData = insertTimelapseItemSchema.parse({
          taskId,
          projectId,
          name: req.body.name,
          description: req.body.description,
          url: url,
          thumbnailUrl: req.body.thumbnailUrl,
          mediaType: mediaType,
          sourceType: sourceType,
          captureDate: req.body.captureDate || new Date(),
          metadata: req.body.metadata || {},
          fileSize: req.body.fileSize
        });
        
        // Create the timelapse item
        const timelapseItem = await storage.createTimelapseItem(timelapseData);
        return res.status(201).json(timelapseItem);
      } else {
        return res.status(401).send("Unauthorized");
      }
    } catch (error) {
      console.error("Error adding timelapse item:", error);
      res.status(500).send("Internal Server Error");
    }
  });
  
  // Update a timelapse item
  app.put("/api/client-projects/:projectId/tasks/:taskId/timelapse/:itemId", async (req, res) => {
    try {
      if (req.isAuthenticated()) {
        const projectId = parseInt(req.params.projectId);
        const taskId = parseInt(req.params.taskId);
        const itemId = parseInt(req.params.itemId);
        
        const project = await storage.getClientProject(projectId);
        if (!project) {
          return res.status(404).send("Project not found");
        }
        
        // Regular users can only update timelapse items in their own projects
        if (!req.user.isAdmin && project.clientId !== req.user.id) {
          return res.status(403).send("Forbidden");
        }
        
        const task = await storage.getProjectTask(taskId);
        if (!task) {
          return res.status(404).send("Task not found");
        }
        
        // Verify task belongs to the specified project
        if (task.projectId !== projectId) {
          return res.status(404).send("Task not found in this project");
        }
        
        const timelapseItem = await storage.getTimelapseItem(itemId);
        if (!timelapseItem) {
          return res.status(404).send("Timelapse item not found");
        }
        
        // Verify timelapse item belongs to the specified task
        if (timelapseItem.taskId !== taskId) {
          return res.status(404).send("Timelapse item not found for this task");
        }
        
        // Update the timelapse item
        const updatedItem = await storage.updateTimelapseItem(itemId, req.body);
        return res.json(updatedItem);
      } else {
        return res.status(401).send("Unauthorized");
      }
    } catch (error) {
      console.error("Error updating timelapse item:", error);
      res.status(500).send("Internal Server Error");
    }
  });
  
  // Delete a timelapse item
  app.delete("/api/client-projects/:projectId/tasks/:taskId/timelapse/:itemId", async (req, res) => {
    try {
      if (req.isAuthenticated()) {
        const projectId = parseInt(req.params.projectId);
        const taskId = parseInt(req.params.taskId);
        const itemId = parseInt(req.params.itemId);
        
        const project = await storage.getClientProject(projectId);
        if (!project) {
          return res.status(404).send("Project not found");
        }
        
        // Regular users can only delete timelapse items in their own projects
        if (!req.user.isAdmin && project.clientId !== req.user.id) {
          return res.status(403).send("Forbidden");
        }
        
        const task = await storage.getProjectTask(taskId);
        if (!task) {
          return res.status(404).send("Task not found");
        }
        
        // Verify task belongs to the specified project
        if (task.projectId !== projectId) {
          return res.status(404).send("Task not found in this project");
        }
        
        const timelapseItem = await storage.getTimelapseItem(itemId);
        if (!timelapseItem) {
          return res.status(404).send("Timelapse item not found");
        }
        
        // Verify timelapse item belongs to the specified task
        if (timelapseItem.taskId !== taskId) {
          return res.status(404).send("Timelapse item not found for this task");
        }
        
        // Delete the timelapse item
        const success = await storage.deleteTimelapseItem(itemId);
        if (!success) {
          return res.status(500).send("Failed to delete timelapse item");
        }
        
        return res.status(204).send();
      } else {
        return res.status(401).send("Unauthorized");
      }
    } catch (error) {
      console.error("Error deleting timelapse item:", error);
      res.status(500).send("Internal Server Error");
    }
  });
  
  // Get timelapse items by specific media type
  app.get("/api/client-projects/:projectId/tasks/:taskId/timelapse/type/:mediaType", async (req, res) => {
    try {
      if (req.isAuthenticated()) {
        const projectId = parseInt(req.params.projectId);
        const taskId = parseInt(req.params.taskId);
        const mediaType = req.params.mediaType;
        
        const project = await storage.getClientProject(projectId);
        if (!project) {
          return res.status(404).send("Project not found");
        }
        
        // Regular users can only view timelapse items in their own projects
        if (!req.user.isAdmin && project.clientId !== req.user.id) {
          return res.status(403).send("Forbidden");
        }
        
        const task = await storage.getProjectTask(taskId);
        if (!task) {
          return res.status(404).send("Task not found");
        }
        
        // Verify task belongs to the specified project
        if (task.projectId !== projectId) {
          return res.status(404).send("Task not found in this project");
        }
        
        // Get timelapse items by media type
        const timelapseItems = await storage.getTimelapseItemsByType(taskId, mediaType);
        return res.json(timelapseItems);
      } else {
        return res.status(401).send("Unauthorized");
      }
    } catch (error) {
      console.error("Error fetching timelapse items by type:", error);
      res.status(500).send("Internal Server Error");
    }
  });
}