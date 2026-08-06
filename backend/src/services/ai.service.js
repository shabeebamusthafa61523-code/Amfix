import Groq from 'groq-sdk';

const apiKey = process.env.Groq_API_KEY || process.env.GROQ_API_KEY;
const groq = apiKey ? new Groq({ apiKey }) : null;

export const generateAIReport = async (prompt, dataContext = null, jsonMode = false) => {
  const fullPrompt = dataContext 
    ? `${prompt}\n\nHere is the JSON data to analyze:\n${JSON.stringify(dataContext, null, 2)}`
    : prompt;

  if (groq) {
    try {
      console.log("🔄 Generating AI Report using Groq (llama-3.3-70b-versatile)...");
      const chatCompletion = await groq.chat.completions.create({
        messages: [
          {
            role: "user",
            content: fullPrompt,
          },
        ],
        model: "llama-3.3-70b-versatile",
        ...(jsonMode && { response_format: { type: "json_object" } })
      });
      
      return chatCompletion.choices[0]?.message?.content || "";
    } catch (error) {
      console.error("🚨 Groq AI Generation failed:", error.message);
      return fallbackMockReport(prompt, dataContext, true);
    }
  } else {
    console.log("ℹ️ No Groq API Key found. Falling back to Smart Mock Mode.");
    return fallbackMockReport(prompt, dataContext, false);
  }
};

export const generateAIChat = async (messages, context = null) => {
  if (groq) {
    try {
      const systemMessage = {
        role: "system",
        content: `You are an expert HR AI Assistant. Your job is to answer questions based on the following report context.\n\nCONTEXT:\n${context || "No context provided."}`
      };
      
      const chatCompletion = await groq.chat.completions.create({
        messages: [systemMessage, ...messages],
        model: "llama-3.3-70b-versatile",
      });
      return chatCompletion.choices[0]?.message?.content || "";
    } catch (error) {
      console.error("Groq Chat Error:", error);
      return "I'm sorry, I am currently experiencing connection issues to the Groq API.";
    }
  } else {
    return "This is the Smart Mock Mode chatbot. Since there is no API key, I am just a placeholder response! Please add the Groq API key to your environment variables to enable real AI Chat.";
  }
};


export const generateEmployeePerformanceReport = async (employeeContext) => {
  const prompt = `
You are an Enterprise AI HR & Performance Evaluation System. Analyze the following comprehensive employee performance dataset and generate a structured, highly intelligent, encouraging yet objective performance evaluation report.

EMPLOYEE EVALUATION DATASET:
- Name: ${employeeContext.name || 'Employee'}
- Designation: ${employeeContext.designation || 'N/A'}
- Department: ${employeeContext.department || 'N/A'}
- Month: ${employeeContext.month || 'Current Month'}
- Attendance Rate: ${employeeContext.kpiScore?.metaStats?.attendancePercentage || 0}% (${employeeContext.kpiScore?.metaStats?.presentDays || 0}/${employeeContext.kpiScore?.metaStats?.workingDays || 22} days)
- Tasks Completed: ${employeeContext.kpiScore?.metaStats?.tasksCompleted || 0} of ${employeeContext.kpiScore?.metaStats?.totalTasks || 0} total tasks
- Overall KPI Score: ${employeeContext.kpiScore?.overallScore || 0}% (Grade: ${employeeContext.kpiScore?.grade || 'Good'})

HR REMARKS:
${employeeContext.hrRemark ? `
- Performance Remark: ${employeeContext.hrRemark.performanceRemark || 'N/A'}
- Strengths: ${employeeContext.hrRemark.strengths || 'N/A'}
- Weaknesses: ${employeeContext.hrRemark.weaknesses || 'N/A'}
- Training Recommendation: ${employeeContext.hrRemark.trainingRecommendation || 'N/A'}
- Promotion Recommendation: ${employeeContext.hrRemark.promotionRecommendation || 'N/A'}
- HR Rating: ${employeeContext.hrRemark.overallRating || 'N/A'}/10
` : 'No HR Remark submitted yet.'}

TEAM LEAD REMARKS:
${employeeContext.tlRemark ? `
- Technical Performance: ${employeeContext.tlRemark.technicalPerformance || 'N/A'}/10
- Task Quality: ${employeeContext.tlRemark.taskQuality || 'N/A'}/10
- Communication: ${employeeContext.tlRemark.communication || 'N/A'}/10
- Collaboration: ${employeeContext.tlRemark.teamCollaboration || 'N/A'}/10
- Code Quality / Problem Solving: ${employeeContext.tlRemark.codeQuality || 'N/A'}/10
- Additional Remarks: ${employeeContext.tlRemark.additionalRemarks || 'N/A'}
- Team Lead Rating: ${employeeContext.tlRemark.overallRating || 'N/A'}/10
` : 'No Team Lead Remark submitted yet.'}

Generate a clean markdown report formatted with headers:
1. Executive Summary
2. Key Strengths & Technical Highlights
3. Areas for Improvement & Recommended Action Items
4. Growth & Upskilling Roadmap
5. Final Architectural Verdict & Rating Summary
`;

  if (groq) {
    try {
      console.log(`🔄 Generating AI Performance Evaluation for ${employeeContext.name}...`);
      const chatCompletion = await groq.chat.completions.create({
        messages: [{ role: 'user', content: prompt }],
        model: 'llama-3.3-70b-versatile'
      });
      return chatCompletion.choices[0]?.message?.content || fallbackEmployeeReport(employeeContext);
    } catch (error) {
      console.error('🚨 Groq Performance AI Error:', error.message);
      return fallbackEmployeeReport(employeeContext, true);
    }
  } else {
    return fallbackEmployeeReport(employeeContext, false);
  }
};

const fallbackEmployeeReport = (context, apiFailed = false) => {
  const name = context.name || 'Employee';
  const score = context.kpiScore?.overallScore || 85;
  const grade = context.kpiScore?.grade || 'Very Good';
  const notice = apiFailed 
    ? '> **Notice:** AI generation synthesized using local analytical rules while primary API is reconnecting.'
    : '> **Notice:** Report generated in Smart Analytical Mode.';

  return `# 🎯 AI Performance Review: ${name}

${notice}

## 📊 Executive Summary
${name} achieved an overall KPI score of **${score}%** (${grade}) for **${context.month || 'this month'}**. Attendance stability is logged at **${context.kpiScore?.metaStats?.attendancePercentage || 95}%**, with **${context.kpiScore?.metaStats?.tasksCompleted || 5}** tasks successfully delivered.

## 🌟 Key Strengths & Highlights
- **Productivity & Execution:** High completion velocity on assigned tasks and active ticket resolution.
- **Team Synergy:** Positive collaborative input noted across team workflows and manager feedback.

## 🛠️ Areas for Improvement
- **Deadline Optimization:** Prioritize urgent tasks earlier in the execution cycle.
- **Skill Expansion:** Continue expanding technical proficiency and workflow documentation.

## 🚀 Growth & Upskilling Roadmap
- Engage in advanced technical modules and department workshops.
- Target a 5% increase in task completion velocity for upcoming sprints.
`;
};

const fallbackMockReport = (prompt, dataContext, apiFailed = false) => {
  const isMonthly = prompt.includes("MONTHLY") || prompt.includes("Monthly") || prompt.includes("monthly");
  
  let topEmployeeStr = "N/A";
  let topCount = -1;
  
  if (dataContext && dataContext.employeeStats) {
      Object.entries(dataContext.employeeStats).forEach(([name, stats]) => {
          if (stats.done > topCount) {
              topCount = stats.done;
              topEmployeeStr = name;
          }
      });
  }

  const noticeMessage = apiFailed 
    ? "> **Notice:** The Groq API is currently unavailable. This report was generated in *Smart Mock Mode* using local data rules as a seamless fallback."
    : "> **Notice:** This report is generated in *Smart Mock Mode* using local data rules because no `Groq_API_KEY` was found in the environment.";

  if (isMonthly) {
    const markdownReport = `# 🤖 AI Monthly Performance Insights (Fallback Mode)

${noticeMessage}

## 🏆 Employee of the Month

**🥇 ${topEmployeeStr !== "N/A" ? topEmployeeStr : "System Admin"}**

**Why?** 
Based on the real database records, ${topEmployeeStr !== "N/A" ? topEmployeeStr : "they"} achieved the highest velocity this month, clearing **${topCount > -1 ? topCount : 5}** tasks completely. Their consistent output significantly reduced the department's backlog!

## 📊 Monthly Overview
- **Productivity:** The team has maintained a steady pace. 
- **Bottlenecks:** Please check the pending task queues for any users with more than 5 pending tasks.
`;
    return JSON.stringify({
      summary: `Monthly analysis complete. Top performer: ${topEmployeeStr}.`,
      teamVibe: "🚀 Peak Performance",
      employeeOfTheMonth: {
        name: topEmployeeStr !== "N/A" ? topEmployeeStr : "System Admin",
        reason: `Highest task completion rate this month with ${topCount > -1 ? topCount : 5} tasks completed.`
      },
      markdownReport
    });
  } else {
    const markdownReport = `# 🤖 AI Daily Status Report (Fallback Mode)

${noticeMessage}

## 🚀 Today's Highlights
- **Activity:** The team successfully closed several tickets today.
- **Attendance:** Please review the dashboard for offline staff.

## ⚠️ Potential Issues
- Keep an eye on tasks stuck in the "preview" stage for more than 24 hours.
`;
    return JSON.stringify({
      summary: "Daily analysis complete. Steady productivity maintained across departments.",
      teamVibe: "⚡ Focused",
      employeeOfTheMonth: {
        name: "N/A",
        reason: ""
      },
      markdownReport
    });
  }
};
