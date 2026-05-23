import type { Express } from "express";
import { db, pool } from "./db";
import { eq, desc, and, gte, lte } from "drizzle-orm";

export function registerOperationalRoutes(app: Express) {
  // Dashboard Summary
  app.get("/api/operational/dashboard-summary", async (req, res) => {
    try {
      // Get basic metrics from existing tables
      const workflowTemplates = await db.query.workflowTemplates?.findMany({ limit: 5 }) || [];
      const projectTracking = await db.query.projectTracking?.findMany({ limit: 10 }) || [];
      const performanceMetrics = await db.query.performanceMetrics?.findMany({ limit: 20 }) || [];
      
      const summary = {
        metrics: performanceMetrics,
        activeProjects: projectTracking.filter(p => p.status === 'active').length,
        completedProjects: projectTracking.filter(p => p.status === 'completed').length,
        upcomingMaintenance: [
          {
            id: 1,
            equipmentId: "DRONE-001",
            description: "Regular maintenance check",
            scheduledDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
            status: "scheduled"
          }
        ]
      };
      
      res.json(summary);
    } catch (error) {
      console.error("Error fetching dashboard summary:", error);
      res.status(500).json({ error: "Failed to fetch dashboard summary" });
    }
  });

  // Workflow Templates
  app.get("/api/operational/workflow-templates", async (req, res) => {
    try {
      const templates = await pool.query(`
        SELECT * FROM workflow_templates 
        WHERE is_active = true 
        ORDER BY created_at DESC
      `);
      
      res.json(templates.rows.map(row => ({
        id: row.id,
        name: row.name,
        description: row.description,
        steps: row.steps,
        serviceType: row.service_type,
        isActive: row.is_active,
        createdAt: row.created_at,
        updatedAt: row.updated_at
      })));
    } catch (error) {
      console.error("Error fetching workflow templates:", error);
      res.status(500).json({ error: "Failed to fetch workflow templates" });
    }
  });

  app.post("/api/operational/workflow-templates", async (req, res) => {
    try {
      const { name, description, serviceType, steps } = req.body;
      
      const result = await pool.query(`
        INSERT INTO workflow_templates (name, description, service_type, steps, is_active)
        VALUES ($1, $2, $3, $4, true)
        RETURNING *
      `, [name, description, serviceType, JSON.stringify(steps)]);
      
      if (result.rows.length > 0) {
        const template = result.rows[0];
        res.json({
          id: template.id,
          name: template.name,
          description: template.description,
          steps: template.steps,
          serviceType: template.service_type,
          isActive: template.is_active,
          createdAt: template.created_at,
          updatedAt: template.updated_at
        });
      } else {
        res.status(500).json({ error: "Failed to create workflow template" });
      }
    } catch (error) {
      console.error("Error creating workflow template:", error);
      res.status(500).json({ error: "Failed to create workflow template" });
    }
  });

  app.put("/api/operational/workflow-templates/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const { name, description, serviceType, steps } = req.body;
      
      const result = await pool.query(`
        UPDATE workflow_templates 
        SET name = $1, description = $2, service_type = $3, steps = $4, updated_at = CURRENT_TIMESTAMP
        WHERE id = $5
        RETURNING *
      `, [name, description, serviceType, JSON.stringify(steps), parseInt(id)]);
      
      if (result.rows.length > 0) {
        const template = result.rows[0];
        res.json({
          id: template.id,
          name: template.name,
          description: template.description,
          steps: template.steps,
          serviceType: template.service_type,
          isActive: template.is_active,
          createdAt: template.created_at,
          updatedAt: template.updated_at
        });
      } else {
        res.status(404).json({ error: "Workflow template not found" });
      }
    } catch (error) {
      console.error("Error updating workflow template:", error);
      res.status(500).json({ error: "Failed to update workflow template" });
    }
  });

  app.delete("/api/operational/workflow-templates/:id", async (req, res) => {
    try {
      const { id } = req.params;
      
      const result = await pool.query(`
        UPDATE workflow_templates 
        SET is_active = false, updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
        RETURNING *
      `, [parseInt(id)]);
      
      if (result.rows.length > 0) {
        res.json({ message: "Workflow template deleted successfully" });
      } else {
        res.status(404).json({ error: "Workflow template not found" });
      }
    } catch (error) {
      console.error("Error deleting workflow template:", error);
      res.status(500).json({ error: "Failed to delete workflow template" });
    }
  });

  // Project Tracking
  app.get("/api/operational/project-tracking", async (req, res) => {
    try {
      const tracking = await pool.query(`
        SELECT * FROM project_tracking 
        ORDER BY last_update DESC
        LIMIT 50
      `);
      
      res.json(tracking.rows.map(row => ({
        id: row.id,
        projectId: row.project_id,
        phase: row.phase,
        status: row.status,
        progressPercentage: row.progress_percentage,
        estimatedCompletion: row.estimated_completion,
        actualCompletion: row.actual_completion,
        milestones: row.milestones,
        blockers: row.blockers,
        lastUpdate: row.last_update,
        createdAt: row.created_at
      })));
    } catch (error) {
      console.error("Error fetching project tracking:", error);
      res.status(500).json({ error: "Failed to fetch project tracking" });
    }
  });

  // Equipment Schedule
  app.get("/api/operational/equipment-schedule", async (req, res) => {
    try {
      const { startDate, endDate } = req.query;
      
      let query = `
        SELECT * FROM equipment_schedule 
        ORDER BY scheduled_start ASC
      `;
      let params: any[] = [];
      
      if (startDate && endDate) {
        query = `
          SELECT * FROM equipment_schedule 
          WHERE scheduled_start >= $1 AND scheduled_end <= $2
          ORDER BY scheduled_start ASC
        `;
        params = [startDate, endDate];
      }
      
      const schedule = await db.execute(query, params);
      
      res.json(schedule.rows.map(row => ({
        id: row.id,
        equipmentId: row.equipment_id,
        equipmentName: row.equipment_name,
        projectId: row.project_id,
        bookingId: row.booking_id,
        scheduledStart: row.scheduled_start,
        scheduledEnd: row.scheduled_end,
        actualStart: row.actual_start,
        actualEnd: row.actual_end,
        status: row.status,
        location: row.location,
        operator: row.operator,
        notes: row.notes,
        createdAt: row.created_at,
        updatedAt: row.updated_at
      })));
    } catch (error) {
      console.error("Error fetching equipment schedule:", error);
      res.status(500).json({ error: "Failed to fetch equipment schedule" });
    }
  });

  // Performance Metrics
  app.get("/api/operational/performance-metrics", async (req, res) => {
    try {
      const { metricType, period } = req.query;
      
      let query = `
        SELECT * FROM performance_metrics 
        ORDER BY created_at DESC
        LIMIT 100
      `;
      let params: any[] = [];
      
      if (metricType) {
        query = `
          SELECT * FROM performance_metrics 
          WHERE metric_type = $1
          ORDER BY created_at DESC
          LIMIT 100
        `;
        params = [metricType];
      }
      
      const metrics = await db.execute(query, params);
      
      res.json(metrics.rows.map(row => ({
        id: row.id,
        metricType: row.metric_type,
        value: row.value,
        unit: row.unit,
        period: row.period,
        periodStart: row.period_start,
        periodEnd: row.period_end,
        projectId: row.project_id,
        serviceId: row.service_id,
        clientId: row.client_id,
        metadata: row.metadata,
        createdAt: row.created_at
      })));
    } catch (error) {
      console.error("Error fetching performance metrics:", error);
      res.status(500).json({ error: "Failed to fetch performance metrics" });
    }
  });

  // Operational Alerts
  app.get("/api/operational/alerts", async (req, res) => {
    try {
      // Mock operational alerts for now
      const alerts = [
        {
          id: 1,
          title: "Equipment Maintenance Due",
          description: "DRONE-001 requires scheduled maintenance",
          severity: "medium",
          isAcknowledged: false,
          createdAt: new Date().toISOString()
        },
        {
          id: 2,
          title: "Project Delay Risk",
          description: "Project #15 may exceed deadline due to weather conditions",
          severity: "high",
          isAcknowledged: false,
          createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()
        }
      ];
      
      res.json(alerts);
    } catch (error) {
      console.error("Error fetching operational alerts:", error);
      res.status(500).json({ error: "Failed to fetch operational alerts" });
    }
  });

  app.put("/api/operational/alerts/:id/acknowledge", async (req, res) => {
    try {
      const { id } = req.params;
      // Mock acknowledge functionality
      res.json({ success: true, message: "Alert acknowledged" });
    } catch (error) {
      console.error("Error acknowledging alert:", error);
      res.status(500).json({ error: "Failed to acknowledge alert" });
    }
  });

  // Communication Automation
  app.get("/api/operational/communication-templates", async (req, res) => {
    try {
      const templates = await db.execute(`
        SELECT * FROM communication_templates 
        WHERE is_active = true 
        ORDER BY created_at DESC
      `);
      
      res.json(templates.rows.map(row => ({
        id: row.id,
        name: row.name,
        type: row.type,
        subject: row.subject,
        content: row.content,
        triggers: row.triggers,
        isActive: row.is_active,
        createdAt: row.created_at,
        updatedAt: row.updated_at
      })));
    } catch (error) {
      console.error("Error fetching communication templates:", error);
      // Return empty array if table doesn't exist yet
      res.json([]);
    }
  });

  // Communication Logs
  app.get("/api/operational/communication-logs", async (req, res) => {
    try {
      const logs = await db.execute(`
        SELECT * FROM communication_logs 
        ORDER BY sent_at DESC
        LIMIT 100
      `);
      
      res.json(logs.rows.map(row => ({
        id: row.id,
        templateId: row.template_id,
        recipientId: row.recipient_id,
        recipientType: row.recipient_type,
        channel: row.channel,
        subject: row.subject,
        content: row.content,
        status: row.status,
        sentAt: row.sent_at,
        deliveredAt: row.delivered_at,
        errorMessage: row.error_message
      })));
    } catch (error) {
      console.error("Error fetching communication logs:", error);
      // Return empty array if table doesn't exist yet
      res.json([]);
    }
  });

  // Project Tracking
  app.get("/api/operational/project-tracking", async (req, res) => {
    try {
      const projects = [
        {
          id: 1,
          name: "Luxury Estate Photography",
          clientName: "Premium Properties LLC",
          status: "In Progress",
          progress: 75,
          startDate: "2025-06-01",
          expectedCompletion: "2025-06-10",
          assignedTeam: ["John (Pilot)", "Sarah (Editor)"],
          currentPhase: "Post-Processing",
          budget: 2500,
          spent: 1875,
          remainingTasks: 3,
          totalTasks: 12,
          priority: "High"
        },
        {
          id: 2,
          name: "Construction Site Monitoring",
          clientName: "BuildRight Construction",
          status: "Planning",
          progress: 25,
          startDate: "2025-06-08",
          expectedCompletion: "2025-06-20",
          assignedTeam: ["Mike (Pilot)", "Lisa (Analyst)"],
          currentPhase: "Site Assessment",
          budget: 4000,
          spent: 1000,
          remainingTasks: 8,
          totalTasks: 10,
          priority: "Medium"
        }
      ];
      
      res.json(projects);
    } catch (error) {
      console.error("Error fetching project tracking:", error);
      res.status(500).json({ error: "Failed to fetch project tracking" });
    }
  });

  // Resource Allocation
  app.get("/api/operational/resource-allocation", async (req, res) => {
    try {
      const allocation = {
        pilots: [
          {
            id: 1,
            name: "John Smith",
            certification: "Part 107 Commercial",
            status: "Active",
            currentProjects: 2,
            maxProjects: 3,
            utilization: 67,
            availability: "Available",
            skills: ["Real Estate", "Construction", "Mapping"]
          },
          {
            id: 2,
            name: "Mike Johnson",
            certification: "Part 107 + Waiver",
            status: "Busy",
            currentProjects: 3,
            maxProjects: 3,
            utilization: 100,
            availability: "Booked until June 15",
            skills: ["Construction", "Industrial", "Emergency Response"]
          }
        ],
        equipment: [
          {
            type: "Consumer Drones",
            total: 3,
            available: 2,
            inUse: 1,
            maintenance: 0
          },
          {
            type: "Professional Drones",
            total: 2,
            available: 1,
            inUse: 1,
            maintenance: 0
          }
        ]
      };
      
      res.json(allocation);
    } catch (error) {
      console.error("Error fetching resource allocation:", error);
      res.status(500).json({ error: "Failed to fetch resource allocation" });
    }
  });
}