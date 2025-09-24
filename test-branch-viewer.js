const axios = require('axios');

const testBranchViewer = async () => {
  try {
    // First, login as Branch Viewer
    console.log('Logging in as Branch Viewer...');
    const loginResponse = await axios.post('http://localhost:5000/api/auth/login', {
      username: 'branch_viewer1',
      password: 'viewer123'
    });
    
    const token = loginResponse.data.token;
    console.log('Login successful, token received');
    console.log('User info:', loginResponse.data.user);
    
    // Now test the reports API
    console.log('\nFetching reports for Branch Viewer...');
    const reportsResponse = await axios.get('http://localhost:5000/api/reports', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('Reports API Response:');
    console.log('Status:', reportsResponse.status);
    console.log('Total reports:', reportsResponse.data.reports.length);
    console.log('Reports:');
    
    reportsResponse.data.reports.forEach((report, index) => {
      console.log(`  ${index + 1}. Status: ${report.status}, Branch: ${report.branch}, Report Number: ${report.reportNumber}`);
    });
    
  } catch (error) {
    console.error('Error:', error.response?.data || error.message);
  }
};

testBranchViewer();
