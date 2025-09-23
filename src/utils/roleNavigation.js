// src/utils/roleNavigation.js
export const navigateByRole = (navigation, role) => {
  switch (role) {
    case 'master':
      navigation.replace('AdminDashboard'); // Master Admin
      break;
    case 'admin':
    case 'customer':
    case 'client':
      navigation.replace('Dashboard');
      break;
    default:
      navigation.replace('UserDashboard');
      break;
  }
};
