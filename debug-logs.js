// Simple test to check if validation logs are working
async function testValidationLogs() {
  try {
    const response = await fetch('http://localhost:3000/api/analytics/sessions');
    const data = await response.json();
    
    console.error('Sessions found:', data.sessions.length);
    
    if (data.sessions.length > 0) {
      const latestSession = data.sessions[0];
      console.error('Latest session ID:', latestSession.sessionId);
      console.error('Latest session stages:', latestSession.attempts[0].stages.length);
      
      const stagesWithLogs = latestSession.attempts[0].stages.filter(stage => 
        (stage.output && stage.output.trim()) || (stage.error && stage.error.trim())
      );
      
      console.error('Stages with logs:', stagesWithLogs.length);
      
      if (stagesWithLogs.length > 0) {
        console.error('First stage with logs:', {
          id: stagesWithLogs[0].id,
          name: stagesWithLogs[0].name,
          hasOutput: Boolean(stagesWithLogs[0].output),
          hasError: Boolean(stagesWithLogs[0].error),
          outputLength: stagesWithLogs[0].output ? stagesWithLogs[0].output.length : 0,
          errorLength: stagesWithLogs[0].error ? stagesWithLogs[0].error.length : 0
        });
      }
    }
  } catch (error) {
    console.error('Error:', error.message);
  }
}

testValidationLogs();