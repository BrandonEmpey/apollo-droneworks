import type { Express } from "express";
import { db } from "./db";

export function registerCustomerExperienceRoutes(app: Express) {
  // Communication automation templates
  app.get("/api/customer-experience/communication-templates", async (req, res) => {
    try {
      const templates = [
        {
          id: 1,
          name: "Project Kickoff",
          type: "email",
          trigger: "project_start",
          subject: "Your Drone Project Has Started - {{projectName}}",
          content: "Dear {{clientName}},\n\nWe're excited to inform you that your project '{{projectName}}' has officially started. Our team will keep you updated throughout the process.\n\nBest regards,\nApollo DroneWorks Team",
          isActive: true,
          createdAt: new Date().toISOString()
        },
        {
          id: 2,
          name: "Progress Update",
          type: "sms",
          trigger: "milestone_reached",
          subject: "Project Update",
          content: "Hi {{clientName}}, your project {{projectName}} has reached {{milestone}}. Expected completion: {{completionDate}}",
          isActive: true,
          createdAt: new Date().toISOString()
        },
        {
          id: 3,
          name: "Project Completion",
          type: "email",
          trigger: "project_complete",
          subject: "Project Complete - {{projectName}}",
          content: "Dear {{clientName}},\n\nGreat news! Your project '{{projectName}}' has been completed successfully. You can access your deliverables through the client portal.\n\nThank you for choosing Apollo DroneWorks!",
          isActive: true,
          createdAt: new Date().toISOString()
        }
      ];
      
      res.json(templates);
    } catch (error) {
      console.error("Error fetching communication templates:", error);
      res.status(500).json({ error: "Failed to fetch communication templates" });
    }
  });

  // Client feedback and surveys
  app.get("/api/customer-experience/feedback", async (req, res) => {
    try {
      const feedback = [
        {
          id: 1,
          clientId: 1,
          clientName: "John Smith",
          projectId: 1,
          projectName: "Estate Photography",
          rating: 5,
          comment: "Exceptional service! The team was professional and delivered stunning aerial photos that exceeded our expectations.",
          category: "Service Quality",
          submittedAt: "2025-05-28T10:30:00Z",
          status: "reviewed"
        },
        {
          id: 2,
          clientId: 2,
          clientName: "Sarah Johnson",
          projectId: 2,
          projectName: "Construction Monitoring",
          rating: 4,
          comment: "Great work overall. The documentation was thorough, though communication could have been more frequent.",
          category: "Communication",
          submittedAt: "2025-05-25T14:15:00Z",
          status: "pending_response"
        },
        {
          id: 3,
          clientId: 3,
          clientName: "Mike Davis",
          projectId: 3,
          projectName: "Equipment Inspection",
          rating: 5,
          comment: "Outstanding technical expertise. The detailed inspection report helped us identify potential issues early.",
          category: "Technical Quality",
          submittedAt: "2025-05-20T09:45:00Z",
          status: "reviewed"
        }
      ];
      
      res.json(feedback);
    } catch (error) {
      console.error("Error fetching feedback:", error);
      res.status(500).json({ error: "Failed to fetch feedback" });
    }
  });

  // Progress tracking for clients
  app.get("/api/customer-experience/progress-tracking", async (req, res) => {
    try {
      const { clientId } = req.query;
      
      const progressData = [
        {
          id: 1,
          projectId: 1,
          projectName: "Luxury Estate Photography",
          clientId: 1,
          currentPhase: "Post-Processing",
          progress: 75,
          milestones: [
            {
              id: 1,
              name: "Site Assessment",
              status: "completed",
              completedAt: "2025-06-01T09:00:00Z",
              description: "Initial site visit and flight planning"
            },
            {
              id: 2,
              name: "Aerial Photography",
              status: "completed",
              completedAt: "2025-06-03T14:30:00Z",
              description: "Drone flight and photo capture session"
            },
            {
              id: 3,
              name: "Post-Processing",
              status: "in_progress",
              completedAt: null,
              description: "Photo editing and enhancement"
            },
            {
              id: 4,
              name: "Final Delivery",
              status: "pending",
              completedAt: null,
              description: "Client review and final deliverables"
            }
          ],
          estimatedCompletion: "2025-06-10T17:00:00Z",
          lastUpdate: "2025-06-05T10:15:00Z"
        },
        {
          id: 2,
          projectId: 2,
          projectName: "Construction Site Monitoring",
          clientId: 2,
          currentPhase: "Planning",
          progress: 25,
          milestones: [
            {
              id: 1,
              name: "Project Scope Review",
              status: "completed",
              completedAt: "2025-06-02T11:00:00Z",
              description: "Requirements analysis and planning"
            },
            {
              id: 2,
              name: "Equipment Setup",
              status: "in_progress",
              completedAt: null,
              description: "Drone and monitoring equipment preparation"
            },
            {
              id: 3,
              name: "Monitoring Phase",
              status: "pending",
              completedAt: null,
              description: "Regular site monitoring and data collection"
            },
            {
              id: 4,
              name: "Report Generation",
              status: "pending",
              completedAt: null,
              description: "Analysis and reporting of findings"
            }
          ],
          estimatedCompletion: "2025-06-20T17:00:00Z",
          lastUpdate: "2025-06-05T08:30:00Z"
        }
      ];
      
      const filteredData = clientId 
        ? progressData.filter(project => project.clientId === parseInt(clientId as string))
        : progressData;
      
      res.json(filteredData);
    } catch (error) {
      console.error("Error fetching progress tracking:", error);
      res.status(500).json({ error: "Failed to fetch progress tracking" });
    }
  });

  // Satisfaction surveys
  app.get("/api/customer-experience/satisfaction-surveys", async (req, res) => {
    try {
      const surveys = [
        {
          id: 1,
          title: "Post-Project Satisfaction Survey",
          description: "Help us improve our services by sharing your experience",
          questions: [
            {
              id: 1,
              type: "rating",
              question: "How would you rate the overall quality of our service?",
              scale: 5,
              required: true
            },
            {
              id: 2,
              type: "rating",
              question: "How satisfied were you with our communication throughout the project?",
              scale: 5,
              required: true
            },
            {
              id: 3,
              type: "multiple_choice",
              question: "What was the most valuable aspect of our service?",
              options: [
                "Technical expertise",
                "Professional communication",
                "Timely delivery",
                "Competitive pricing",
                "Quality of deliverables"
              ],
              required: true
            },
            {
              id: 4,
              type: "text",
              question: "What could we improve for future projects?",
              required: false
            },
            {
              id: 5,
              type: "rating",
              question: "How likely are you to recommend our services to others?",
              scale: 10,
              required: true
            }
          ],
          isActive: true,
          createdAt: "2025-05-15T10:00:00Z"
        }
      ];
      
      res.json(surveys);
    } catch (error) {
      console.error("Error fetching satisfaction surveys:", error);
      res.status(500).json({ error: "Failed to fetch satisfaction surveys" });
    }
  });

  // Submit survey response
  app.post("/api/customer-experience/submit-survey", async (req, res) => {
    try {
      const { surveyId, clientId, projectId, responses } = req.body;
      
      // Calculate satisfaction score
      const ratingResponses = responses.filter((r: any) => r.type === 'rating');
      const averageRating = ratingResponses.reduce((sum: number, r: any) => sum + r.value, 0) / ratingResponses.length;
      
      const surveyResponse = {
        id: Date.now(),
        surveyId,
        clientId,
        projectId,
        responses,
        satisfactionScore: averageRating,
        submittedAt: new Date().toISOString()
      };
      
      res.json({
        success: true,
        message: "Survey response submitted successfully",
        responseId: surveyResponse.id,
        satisfactionScore: surveyResponse.satisfactionScore
      });
    } catch (error) {
      console.error("Error submitting survey:", error);
      res.status(500).json({ error: "Failed to submit survey" });
    }
  });

  // Communication logs
  app.get("/api/customer-experience/communication-logs", async (req, res) => {
    try {
      const { clientId, projectId } = req.query;
      
      const logs = [
        {
          id: 1,
          clientId: 1,
          projectId: 1,
          type: "email",
          subject: "Project Kickoff - Luxury Estate Photography",
          content: "Welcome email sent to client",
          sentAt: "2025-06-01T08:00:00Z",
          status: "delivered",
          templateId: 1
        },
        {
          id: 2,
          clientId: 1,
          projectId: 1,
          type: "sms",
          subject: "Progress Update",
          content: "SMS notification sent about project milestone",
          sentAt: "2025-06-03T15:00:00Z",
          status: "delivered",
          templateId: 2
        },
        {
          id: 3,
          clientId: 2,
          projectId: 2,
          type: "email",
          subject: "Project Kickoff - Construction Site Monitoring",
          content: "Welcome email sent to client",
          sentAt: "2025-06-02T09:00:00Z",
          status: "delivered",
          templateId: 1
        }
      ];
      
      let filteredLogs = logs;
      
      if (clientId) {
        filteredLogs = filteredLogs.filter(log => log.clientId === parseInt(clientId as string));
      }
      
      if (projectId) {
        filteredLogs = filteredLogs.filter(log => log.projectId === parseInt(projectId as string));
      }
      
      res.json(filteredLogs);
    } catch (error) {
      console.error("Error fetching communication logs:", error);
      res.status(500).json({ error: "Failed to fetch communication logs" });
    }
  });

  // Update feedback status
  app.put("/api/customer-experience/feedback/:id/status", async (req, res) => {
    try {
      const { id } = req.params;
      const { status, response } = req.body;
      
      res.json({
        success: true,
        message: "Feedback status updated successfully",
        feedbackId: id,
        newStatus: status,
        updatedAt: new Date().toISOString()
      });
    } catch (error) {
      console.error("Error updating feedback status:", error);
      res.status(500).json({ error: "Failed to update feedback status" });
    }
  });
}