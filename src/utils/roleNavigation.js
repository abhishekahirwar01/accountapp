// src/utils/roleNavigation.js
export const navigateByRole = (navigation, role) => {
  switch (role) {
    case 'master':
      navigation.replace('AdminDashboard', { role }); // pass role
      break;
    case 'admin':
    case 'customer':
    case 'client':
      navigation.replace('Dashboard', { role }); // pass role
      break;
    default:
      navigation.replace('UserDashboard', { role }); // pass role
      break;
  }
};
