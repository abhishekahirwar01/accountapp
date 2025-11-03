// src/utils/roleNavigation.js
export const navigateByRole = (navigation, role) => {
  switch (role) {
    case 'master':
      navigation.replace('AdminDashboard', { role }); // pass role
      break;
    case 'admin':
    case 'customer':
    case 'client':
      navigation.replace('CustomerDashboard', { role }); // pass role
      break;
    case 'user': 
      navigation.replace('UserDashboard', { role }); // pass role
      break;
    default:
      // fallback for any unknown role
      navigation.replace('UserDashboard', { role }); 
      break;
  }
};
