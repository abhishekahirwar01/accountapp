// RN_AccountApp/
// ├── android/                   # Android native files
// ├── ios/                      # iOS native files
// ├── assets/                   # Static assets
// │   ├── images/               # App images
// │   ├── icons/                # App icons
// │   └── fonts/                # Custom fonts
// ├── src/
// │   ├── screens/              # All app screens
// │   │   ├── auth/             # Authentication screens
// │   │   │   ├── LoginScreen.tsx              # from src/app/login/page.tsx
// │   │   │   ├── ClientLoginScreen.tsx        # from src/app/client-login/[slug]/page.tsx
// │   │   │   └── UserLoginScreen.tsx          # from src/app/user-login/
// │   │   ├── admin/            # Admin screens
// │   │   │   ├── AdminDashboardScreen.tsx     # from src/app/(app)/admin-dashboard/page.tsx
// │   │   │   ├── AnalyticsScreen.tsx          # from src/app/(app)/admin/analytics/page.tsx
// │   │   │   ├── ClientManagementScreen.tsx   # from src/app/(app)/admin/client-management/page.tsx
// │   │   │   ├── CompaniesScreen.tsx          # from src/app/(app)/admin/companies/page.tsx
// │   │   │   ├── HistoryScreen.tsx            # from src/app/(app)/admin/history/page.tsx
// │   │   │   ├── PermissionsScreen.tsx        # from src/app/(app)/admin/permissions/page.tsx
// │   │   │   └── SettingsScreen.tsx           # from src/app/(app)/admin/settings/page.tsx
// │   │   ├── main/             # Main app screens
// │   │   │   ├── DashboardScreen.tsx          # from src/app/(app)/dashboard/page.tsx
// │   │   │   ├── TransactionsScreen.tsx       # from src/app/(app)/transactions/page.tsx
// │   │   │   ├── InventoryScreen.tsx          # from src/app/(app)/inventory/page.tsx
// │   │   │   ├── ProfileScreen.tsx            # from src/app/(app)/profile/page.tsx
// │   │   │   ├── ReportsScreen.tsx            # from src/app/(app)/reports/page.tsx
// │   │   │   │   ├── BalanceSheetScreen.tsx   # from src/app/(app)/reports/balance-sheet/
// │   │   │   │   └── ProfitLossScreen.tsx     # from src/app/(app)/reports/profit-loss/
// │   │   │   ├── SettingsScreen.tsx           # from src/app/(app)/settings/page.tsx
// │   │   │   ├── UsersScreen.tsx              # from src/app/(app)/users/page.tsx
// │   │   │   ├── UserDashboardScreen.tsx      # from src/app/(app)/user-dashboard/page.tsx
// │   │   │   └── ClientManagementScreen.tsx   # from src/app/(app)/client-management/page.tsx
// │   │   └── modals/           # Modal screens
// │   ├── components/           # All reusable components
// │   │   ├── admin/            # Admin components
// │   │   │   └── settings/
// │   │   │       ├── ClientsValidityManager.tsx
// │   │   │       └── ClientValidityCard.tsx
// │   │   ├── analytics/        # Analytics components
// │   │   │   ├── BalanceSheet.tsx
// │   │   │   ├── CompaniesTab.tsx
// │   │   │   ├── DashboardTab.tsx
// │   │   │   ├── ExportTransaction.tsx
// │   │   │   ├── ProfitAndLoss.tsx
// │   │   │   ├── TransactionsTab.tsx
// │   │   │   └── UsersTab.tsx
// │   │   ├── bankdetails/      # Bank details components
// │   │   │   └── BankDetailForm.tsx
// │   │   ├── clients/          # Client components
// │   │   │   ├── ClientCard.tsx
// │   │   │   └── ClientForm.tsx
// │   │   ├── companies/        # Company components
// │   │   │   ├── AdminCompanyForm.tsx
// │   │   │   ├── CompanyCard.tsx
// │   │   │   ├── CompanyForm.tsx
// │   │   │   ├── StepIndicator.tsx
// │   │   │   ├── StepOne.tsx
// │   │   │   ├── StepThree.tsx
// │   │   │   └── StepTwo.tsx
// │   │   ├── customers/        # Customer components
// │   │   │   └── CustomerForm.tsx
// │   │   ├── dashboard/        # Dashboard components
// │   │   │   ├── ClientStatusChart.tsx
// │   │   │   ├── ExpenseChart.tsx
// │   │   │   ├── KPICard.tsx
// │   │   │   ├── ProductStock.tsx
// │   │   │   ├── RecentTransactions.tsx
// │   │   │   └── RevenueChart.tsx
// │   │   ├── invoices/         # Invoice components
// │   │   │   ├── InvoicePreview.tsx
// │   │   │   ├── IssueInvoiceNumberButton.tsx
// │   │   │   ├── Template1.tsx
// │   │   │   ├── Template2.tsx
// │   │   │   └── Template3.tsx
// │   │   ├── layout/           # Layout components
// │   │   │   ├── AppSidebar.tsx
// │   │   │   ├── CompanySwitcher.tsx
// │   │   │   ├── ThemeProvider.tsx
// │   │   │   ├── ThemeToggle.tsx
// │   │   │   └── UserNav.tsx
// │   │   ├── notifications/    # Notification components
// │   │   │   └── Notification.tsx
// │   │   ├── pdf/              # PDF components
// │   │   │   └── InvoicePDF.tsx
// │   │   ├── products/         # Product components
// │   │   │   ├── ProductCard.tsx
// │   │   │   ├── ProductForm.tsx
// │   │   │   └── ProductTable.tsx
// │   │   ├── services/         # Service components
// │   │   │   ├── ServiceCard.tsx
// │   │   │   ├── ServiceForm.tsx
// │   │   │   └── ServiceTable.tsx
// │   │   ├── settings/         # Settings components
// │   │   │   ├── BankSettings.tsx
// │   │   │   ├── CustomerSettings.tsx
// │   │   │   ├── EmailSendingConsent.tsx
// │   │   │   ├── NotificationsTab.tsx
// │   │   │   ├── ProductSettings.tsx
// │   │   │   ├── ProfileTab.tsx
// │   │   │   ├── ServiceSettings.tsx
// │   │   │   └── VendorSettings.tsx
// │   │   ├── sidebar/          # Sidebar components
// │   │   │   └── UserSidebar.tsx
// │   │   ├── transactions/     # Transaction components
// │   │   ├── ui/               # UI components (Radix UI adapted for RN)
// │   │   │   ├── Accordion.tsx
// │   │   │   ├── AlertDialog.tsx
// │   │   │   ├── Alert.tsx
// │   │   │   ├── Avatar.tsx
// │   │   │   ├── Badge.tsx
// │   │   │   ├── Button.tsx
// │   │   │   ├── Calendar.tsx
// │   │   │   ├── Card.tsx
// │   │   │   ├── Carousel.tsx
// │   │   │   ├── Chart.tsx
// │   │   │   ├── Checkbox.tsx
// │   │   │   ├── Collapsible.tsx
// │   │   │   ├── Combobox.tsx
// │   │   │   ├── Command.tsx
// │   │   │   ├── Dialog.tsx
// │   │   │   ├── DropdownMenu.tsx
// │   │   │   ├── Form.tsx
// │   │   │   ├── Input.tsx
// │   │   │   ├── Label.tsx
// │   │   │   ├── Menubar.tsx
// │   │   │   ├── Popover.tsx
// │   │   │   ├── Progress.tsx
// │   │   │   ├── RadioGroup.tsx
// │   │   │   ├── ScrollArea.tsx
// │   │   │   ├── Select.tsx
// │   │   │   ├── Separator.tsx
// │   │   │   ├── Sheet.tsx
// │   │   │   ├── Sidebar.tsx
// │   │   │   ├── Skeleton.tsx
// │   │   │   ├── Slider.tsx
// │   │   │   ├── Switch.tsx
// │   │   │   ├── Table.tsx
// │   │   │   ├── Tabs.tsx
// │   │   │   ├── Textarea.tsx
// │   │   │   ├── Toast.tsx
// │   │   │   ├── Toaster.tsx
// │   │   │   └── Tooltip.tsx
// │   │   ├── users/            # User components
// │   │   │   ├── Columns.tsx
// │   │   │   ├── ResetPasswordDialog.tsx
// │   │   │   ├── UserCard.tsx
// │   │   │   ├── UserForm.tsx
// │   │   │   ├── UserPermissions.tsx
// │   │   │   └── UserTable.tsx
// │   │   ├── utils/            # Utility components
// │   │   │   └── Prefix.ts
// │   │   └── vendors/          # Vendor components
// │   │       └── VendorForm.tsx
// │   ├── navigation/           # Navigation setup
// │   │   ├── AppNavigator.tsx
// │   │   ├── AuthNavigator.tsx
// │   │   ├── AdminNavigator.tsx
// │   │   ├── MainNavigator.tsx
// │   │   └── TabNavigator.tsx
// │   ├── contexts/             # React contexts
// │   │   ├── CompanyContext.tsx
// │   │   ├── PermissionContext.tsx
// │   │   └── UserPermissionsContext.tsx
// │   ├── hooks/                # Custom hooks
// │   │   ├── useAuth.ts
// │   │   ├── usePayments.ts
// │   │   ├── useReceipts.ts
// │   │   ├── useOptimizedFetch.ts
// │   │   ├── useMobile.tsx
// │   │   └── useClientAnalytics.tsx
// │   ├── lib/                  # Utilities and API calls
// │   │   ├── api.ts
// │   │   ├── auth.ts
// │   │   ├── authSession.ts    # Note: localStorage → AsyncStorage
// │   │   ├── data.ts
// │   │   ├── getUnifiedLines.ts
// │   │   ├── invoices.ts
// │   │   ├── pdf-templates.ts
// │   │   ├── permissions.ts
// │   │   ├── types.ts
// │   │   └── utils.ts
// │   ├── services/             # Business services
// │   │   └── businessService.ts
// │   ├── ai/                   # AI functionality
// │   │   ├── flows/
// │   │   │   └── CategorizeTransaction.ts
// │   │   ├── dev.ts
// │   │   └── genkit.ts
// │   └── constants/            # App constants
// │       ├── colors.ts         # Replaces CSS variables
// │       ├── styles.ts         # Replaces globals.css
// │       ├── invoiceStyles.ts  # Replaces invoice.css files
// │       └── config.ts
// ├── App.tsx                   # Main app component
// ├── app.json                  # App configuration
// ├── package.json
// ├── tsconfig.json
// ├── babel.config.js
// ├── metro.config.js
// └── index.js                  # Entry point