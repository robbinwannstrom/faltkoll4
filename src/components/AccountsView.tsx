import React, { useState, useEffect } from 'react';
import { UserAccount, UserRole, AppLicense, TeacherExercise } from '../types';
import {
  User,
  ShieldCheck,
  Shield,
  Plus,
  Trash2,
  CheckCircle2,
  ArrowLeft,
  Key,
  Mail,
  GraduationCap,
  Building,
  RefreshCw,
  LogOut,
  UserCheck,
  Clock,
  Sparkles,
  Search,
  Lock,
  ShieldAlert,
  Copy,
  Settings,
  Eye,
  EyeOff,
  AlertCircle,
  LogIn,
  Edit3,
  Filter,
  Users,
  ChevronDown,
  Check,
  BookOpen,
  FolderPlus,
  Award,
  Layers,
} from 'lucide-react';
import { safeFetchJson } from '../services/apiHelper';
import {
  saveUserToCloud,
  fetchAllUsersFromCloud,
  deleteUserFromCloud,
  canEditUser,
  canDeleteUser,
  canChangeRoleTo,
  getRoleRank,
  getRoleRankLabel,
  STANDARD_STUDENT_GROUPS,
  fetchCustomStudentGroupsFromCloud,
  saveCustomStudentGroupsToCloud,
} from '../services/userService';
import { TeacherExerciseCreatorModal } from './TeacherExerciseCreatorModal';
import { StudentGroupsManagerPanel } from './StudentGroupsManagerPanel';

interface AccountsViewProps {
  currentUser: UserAccount | null;
  onUserLoggedIn: (user: UserAccount) => void;
  onUserLoggedOut: () => void;
  onBack: () => void;
  onStartExerciseProject?: (exercise: TeacherExercise) => void;
}

type SortOrder = 'NAME_ASC' | 'NAME_DESC' | 'GROUP' | 'RANK_DESC' | 'CLASS' | 'LAST_LOGIN' | 'NEWEST';

export const AccountsView: React.FC<AccountsViewProps> = ({
  currentUser,
  onUserLoggedIn,
  onUserLoggedOut,
  onBack,
  onStartExerciseProject,
}) => {
  const [allUsers, setAllUsers] = useState<UserAccount[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilter, setActiveFilter] = useState<'ALL' | 'STUDENT' | 'TEACHER' | 'SCHOOL_ADMIN' | 'ADMIN'>('ALL');
  const [selectedGroupFilter, setSelectedGroupFilter] = useState<string>('ALL');
  const [sortOrder, setSortOrder] = useState<SortOrder>('GROUP');
  const [activeSubTab, setActiveSubTab] = useState<'ACCOUNTS' | 'GROUPS' | 'CREATE'>('ACCOUNTS');

  // Exercise Creator modal
  const [isExerciseCreatorOpen, setIsExerciseCreatorOpen] = useState(false);

  // License & Permissions State
  const [license, setLicense] = useState<AppLicense>({
    status: 'LICENSED',
    licenseKey: 'SKOLA-2026-FALTHJALP',
    schoolName: 'Bygg- & Anläggningsutbildning',
    validUntil: '2028-12-31',
    maxSeats: 150,
    allowTeacherAccountCreation: true,
  });
  const [copiedKey, setCopiedKey] = useState(false);

  // New user form state
  const [newUserName, setNewUserName] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('1234');
  const [newUserRole, setNewUserRole] = useState<UserRole>('STUDENT');
  const [newUserOrg, setNewUserOrg] = useState('Bygg- & Anläggningsprogrammet');
  const [newUserGroup, setNewUserGroup] = useState('Byggprogrammet (BA)');
  const [newUserCustomGroup, setNewUserCustomGroup] = useState('');
  const [newUserClass, setNewUserClass] = useState('BA25');
  const [customGroups, setCustomGroups] = useState<string[]>(() => {
    try {
      const raw = localStorage.getItem('faltkoll_custom_groups');
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });
  const [isNewGroupModalOpen, setIsNewGroupModalOpen] = useState(false);
  const [newGroupNameInput, setNewGroupNameInput] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Edit user modal state
  const [editingUser, setEditingUser] = useState<UserAccount | null>(null);
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editPassword, setEditPassword] = useState('');
  const [editGroup, setEditGroup] = useState('');
  const [editCustomGroup, setEditCustomGroup] = useState('');
  const [editSchoolClass, setEditSchoolClass] = useState('');
  const [editSchool, setEditSchool] = useState('');
  const [editRole, setEditRole] = useState<UserRole>('STUDENT');
  const [editTeacherId, setEditTeacherId] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  // Password inline editing state
  const [editingPasswordUserId, setEditingPasswordUserId] = useState<string | null>(null);
  const [newPasswordVal, setNewPasswordVal] = useState('');

  // Admin / Teacher Login State (when accessed without management privileges)
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [showAdminPassword, setShowAdminPassword] = useState(false);
  const [isLoggingInAdmin, setIsLoggingInAdmin] = useState(false);
  const [adminLoginError, setAdminLoginError] = useState<string | null>(null);
  const [showTeacherLoginForm, setShowTeacherLoginForm] = useState(false);

  const isAdmin = currentUser?.role === 'ADMIN' || currentUser?.role === 'SCHOOL_ADMIN';
  const isMainAdmin = currentUser?.role === 'ADMIN';
  const isSchoolAdmin = currentUser?.role === 'SCHOOL_ADMIN';
  const isTeacher = currentUser?.role === 'TEACHER';
  const isStudent = currentUser?.role === 'STUDENT';
  const canManageAccounts = isAdmin || isTeacher;

  const handleAdminLoginSubmit = async (e?: React.FormEvent, directEmail?: string, directPass?: string) => {
    if (e) e.preventDefault();
    setAdminLoginError(null);

    const emailToUse = (directEmail || adminEmail).trim();
    const passToUse = (directPass || adminPassword).trim();

    if (!emailToUse || !passToUse) {
      setAdminLoginError('Vänligen ange både e-post/användarnamn och lösenord.');
      return;
    }

    setIsLoggingInAdmin(true);

    try {
      const res = await safeFetchJson<{ user: UserAccount }>('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: emailToUse, password: passToUse }),
      });

      if (res.ok && res.data?.user) {
        if (
          res.data.user.role !== 'ADMIN' &&
          res.data.user.role !== 'SCHOOL_ADMIN' &&
          res.data.user.role !== 'TEACHER'
        ) {
          throw new Error('Detta konto har inte lärar- eller administratörsbehörighet.');
        }
        onUserLoggedIn(res.data.user);
        try {
          localStorage.setItem('falthjalp_current_user', JSON.stringify(res.data.user));
        } catch {}
        setSuccessMsg(`Välkommen! Inloggad som ${res.data.user.displayName} (${getRoleRankLabel(res.data.user.role)}).`);
        setTimeout(() => setSuccessMsg(null), 4000);
        return;
      }

      const norm = emailToUse.toLowerCase();
      // Main Admin
      if (
        norm === 'admin@faltkoll.se' ||
        norm === 'admin@skola.se' ||
        norm === 'admin' ||
        norm === 'admin@falthjalp.se'
      ) {
        if (passToUse === 'admin123' || passToUse === 'admin' || passToUse === 'Admin2026!' || passToUse === '1234') {
          const adminUser: UserAccount = {
            id: 'usr_admin_main',
            email: norm.includes('@') ? norm : 'admin@faltkoll.se',
            displayName: 'Huvudadministratör (Admin)',
            role: 'ADMIN',
            password: passToUse,
            schoolOrCompany: 'Anläggningsutbildning & Egenkontroll',
            createdAt: '2026-09-26 10:00',
            lastLogin: new Date().toISOString().replace('T', ' ').substring(0, 16),
          };
          onUserLoggedIn(adminUser);
          try {
            localStorage.setItem('falthjalp_current_user', JSON.stringify(adminUser));
          } catch {}
          setSuccessMsg('Välkommen! Du är nu inloggad som Huvudadministratör (Rank 4).');
          setTimeout(() => setSuccessMsg(null), 4000);
          return;
        }
      }

      // School Admin
      if (norm === 'skoladmin' || norm === 'skoladmin@skola.se' || norm === 'rektor@skola.se') {
        if (passToUse === '1234' || passToUse === 'admin123' || passToUse === 'skola123') {
          const schoolAdminUser: UserAccount = {
            id: 'usr_school_admin_1',
            email: 'skoladmin@skola.se',
            displayName: 'Skoladministratör (Rektor / Utbildningsledare)',
            role: 'SCHOOL_ADMIN',
            password: passToUse,
            schoolOrCompany: 'Bygg- & Anläggningsutbildning',
            createdAt: '2026-01-05 08:00',
            lastLogin: new Date().toISOString().replace('T', ' ').substring(0, 16),
          };
          onUserLoggedIn(schoolAdminUser);
          try {
            localStorage.setItem('falthjalp_current_user', JSON.stringify(schoolAdminUser));
          } catch {}
          setSuccessMsg('Välkommen! Du är nu inloggad som Skoladministratör (Rank 3).');
          setTimeout(() => setSuccessMsg(null), 4000);
          return;
        }
      }

      // Teacher Angfar
      if (norm === 'angfar' || norm === 'angfar@skola.se') {
        if (passToUse === '1234' || passToUse === 'larare123') {
          const teacherUser: UserAccount = {
            id: 'usr_angfar_teacher',
            email: 'angfar@skola.se',
            displayName: 'Angfar',
            role: 'TEACHER',
            password: '1234',
            schoolOrCompany: 'Bygg- & Anläggningsutbildning',
            createdAt: '2026-01-10 08:00',
            lastLogin: new Date().toISOString().replace('T', ' ').substring(0, 16),
          };
          onUserLoggedIn(teacherUser);
          try {
            localStorage.setItem('falthjalp_current_user', JSON.stringify(teacherUser));
          } catch {}
          setSuccessMsg('Välkommen! Du är nu inloggad som Yrkeslärare Angfar (Rank 2).');
          setTimeout(() => setSuccessMsg(null), 4000);
          return;
        }
      }

      const localAdmin = allUsers.find(
        (u) =>
          (u.role === 'ADMIN' || u.role === 'SCHOOL_ADMIN' || u.role === 'TEACHER') &&
          (u.email.toLowerCase() === norm || u.displayName.toLowerCase() === norm) &&
          (!u.password || u.password === passToUse)
      );

      if (localAdmin) {
        onUserLoggedIn(localAdmin);
        try {
          localStorage.setItem('falthjalp_current_user', JSON.stringify(localAdmin));
        } catch {}
        setSuccessMsg(`Välkommen! Inloggad som ${localAdmin.displayName}.`);
        setTimeout(() => setSuccessMsg(null), 4000);
        return;
      }

      setAdminLoginError('Felaktig e-post eller lösenord. Kontrollera dina uppgifter.');
    } catch (err: any) {
      setAdminLoginError(err?.message || 'Kunde inte logga in. Kontrollera nätverket.');
    } finally {
      setIsLoggingInAdmin(false);
    }
  };

  const loadUsers = async () => {
    setIsLoading(true);
    try {
      let serverUsers: UserAccount[] = [];
      const res = await safeFetchJson<{ users: UserAccount[] }>(
        `/api/users?callerRole=${currentUser?.role || ''}&callerId=${currentUser?.id || ''}`
      );
      if (res.ok && res.data?.users && Array.isArray(res.data.users)) {
        serverUsers = res.data.users;
      }

      const cloudUsers = await fetchAllUsersFromCloud();
      const cloudCustomGroups = await fetchCustomStudentGroupsFromCloud();
      if (cloudCustomGroups.length > 0) {
        setCustomGroups(cloudCustomGroups);
      }

      const defaultTeacherAngfar: UserAccount = {
        id: 'usr_angfar_teacher',
        email: 'angfar@skola.se',
        displayName: 'Angfar (Yrkeslärare)',
        role: 'TEACHER',
        password: '1234',
        schoolOrCompany: 'Bygg- & Anläggningsutbildning',
        createdAt: '2026-01-10 08:00',
        lastLogin: '2026-09-28 08:15',
      };

      const defaultSchoolAdmin: UserAccount = {
        id: 'usr_school_admin_1',
        email: 'skoladmin@skola.se',
        displayName: 'Skoladministratör (Utbildningsledare)',
        role: 'SCHOOL_ADMIN',
        password: '1234',
        schoolOrCompany: 'Bygg- & Anläggningsutbildning',
        createdAt: '2026-01-05 08:00',
        lastLogin: '2026-09-28 07:50',
      };

      const defaultSampleStudents: UserAccount[] = [
        {
          id: 'usr_student_demo_1',
          email: 'elev1@skola.se',
          displayName: 'Erik Andersson (Elev)',
          role: 'STUDENT',
          password: '1234',
          schoolOrCompany: 'Bygg- & Anläggningsprogrammet',
          studentGroup: 'Anläggare (Mark & Anläggning)',
          schoolClass: 'BA24-ANL',
          teacherId: 'usr_angfar_teacher',
          createdAt: '2026-02-01 09:00',
          lastLogin: '2026-09-28 09:30',
        },
        {
          id: 'usr_student_demo_2',
          email: 'elev2@skola.se',
          displayName: 'Maja Lindström (Elev)',
          role: 'STUDENT',
          password: '1234',
          schoolOrCompany: 'Bygg- & Anläggningsprogrammet',
          studentGroup: 'Byggprogrammet (BA)',
          schoolClass: 'BA25-BYGG',
          teacherId: 'usr_angfar_teacher',
          createdAt: '2026-02-02 10:15',
          lastLogin: '2026-09-28 10:05',
        },
        {
          id: 'usr_student_demo_3',
          email: 'elev3@skola.se',
          displayName: 'Kevin Berg (Vuxenelev)',
          role: 'STUDENT',
          password: '1234',
          schoolOrCompany: 'Vuxenutbildningen',
          studentGroup: 'Vuxenutbildning (Yrkesvux)',
          schoolClass: 'VUX26-MARK',
          teacherId: 'usr_angfar_teacher',
          createdAt: '2026-02-10 08:40',
          lastLogin: '2026-09-27 14:20',
        },
        {
          id: 'usr_student_demo_4',
          email: 'elev4@skola.se',
          displayName: 'Linnéa Holm (Gymnasieelev)',
          role: 'STUDENT',
          password: '1234',
          schoolOrCompany: 'Bygg- & Anläggningsprogrammet',
          studentGroup: 'Gymnasie (Åk 1–3)',
          schoolClass: 'BA26-GYM',
          teacherId: 'usr_angfar_teacher',
          createdAt: '2026-02-12 11:00',
          lastLogin: '2026-09-28 11:10',
        },
      ];

      let localSavedUsers: UserAccount[] = [];
      try {
        const raw = localStorage.getItem('falthjalp_shared_users');
        if (raw) {
          localSavedUsers = JSON.parse(raw);
        }
      } catch {}

      const mergedMap = new Map<string, UserAccount>();
      [
        defaultSchoolAdmin,
        defaultTeacherAngfar,
        ...defaultSampleStudents,
        ...localSavedUsers,
        ...serverUsers,
        ...cloudUsers,
      ].forEach((u) => {
        if (u && u.id) {
          mergedMap.set(u.id, u);
        }
      });

      const mergedList = Array.from(mergedMap.values());
      setAllUsers(mergedList);
      try {
        localStorage.setItem('falthjalp_shared_users', JSON.stringify(mergedList));
      } catch {}
    } catch (e) {
      console.error('Error loading users', e);
    } finally {
      setIsLoading(false);
    }
  };

  const loadLicense = async () => {
    try {
      const res = await safeFetchJson<{ license: AppLicense }>('/api/license');
      if (res.ok && res.data?.license) {
        setLicense(res.data.license);
      }
    } catch (e) {
      console.error('Error loading license', e);
    }
  };

  useEffect(() => {
    loadUsers();
    loadLicense();
  }, [currentUser?.id, currentUser?.role]);

  const handleToggleRequireLogin = async (requireLogin: boolean) => {
    try {
      const res = await safeFetchJson<{ license: AppLicense }>('/api/license/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          callerRole: currentUser?.role,
          requireLoginOnStartup: requireLogin,
        }),
      });
      if (res.ok && res.data?.license) {
        setLicense(res.data.license);
        setSuccessMsg(
          requireLogin
            ? 'Inloggningskrav vid start är nu AKTIVERAT.'
            : 'Öppet läge aktiverat: Appen startar nu direkt utan inloggningskrav.'
        );
        setTimeout(() => setSuccessMsg(null), 4000);
      }
    } catch {
      setLicense((prev) => ({ ...prev, requireLoginOnStartup: requireLogin }));
    }
  };

  const handleCopyLicenseKey = () => {
    navigator.clipboard?.writeText(license.licenseKey);
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2000);
  };

  const handleAddNewCustomGroup = async () => {
    const trimmed = newGroupNameInput.trim();
    if (!trimmed) return;
    if (!allAvailableGroups.includes(trimmed)) {
      const updated = [...customGroups, trimmed];
      setCustomGroups(updated);
      await saveCustomStudentGroupsToCloud(updated);
    }
    setNewUserGroup(trimmed);
    if (editingUser) {
      setEditGroup(trimmed);
    }
    setNewGroupNameInput('');
    setIsNewGroupModalOpen(false);
    setSuccessMsg(`Gruppen "${trimmed}" har skapats och är redo att användas!`);
    setTimeout(() => setSuccessMsg(null), 3500);
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!newUserName.trim() || !newUserEmail.trim() || !newUserPassword.trim()) {
      setErrorMsg('Vänligen fyll i namn, e-post/användarnamn och lösenord.');
      return;
    }

    const roleToAssign: UserRole = isAdmin ? newUserRole : 'STUDENT';
    const finalGroup =
      roleToAssign === 'STUDENT'
        ? newUserGroup === '__CUSTOM__'
          ? newUserCustomGroup.trim() || 'Allmän grupp'
          : newUserGroup
        : undefined;

    if (finalGroup && !STANDARD_STUDENT_GROUPS.includes(finalGroup) && !customGroups.includes(finalGroup)) {
      const updatedGroups = [...customGroups, finalGroup];
      setCustomGroups(updatedGroups);
      await saveCustomStudentGroupsToCloud(updatedGroups);
    }

    setIsCreating(true);
    try {
      const nowStr = new Date().toISOString().replace('T', ' ').substring(0, 16);
      const newAccount: UserAccount = {
        id: `usr_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        email: newUserEmail.trim(),
        displayName: newUserName.trim(),
        password: newUserPassword.trim(),
        role: roleToAssign,
        schoolOrCompany: newUserOrg.trim() || 'Bygg- & Anläggningsprogrammet',
        studentGroup: finalGroup,
        schoolClass: roleToAssign === 'STUDENT' ? newUserClass.trim() || undefined : undefined,
        teacherId: isTeacher ? currentUser?.id : undefined,
        createdAt: nowStr,
        lastLogin: nowStr,
      };

      const res = await safeFetchJson<{ user: UserAccount; error?: string }>('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newAccount,
          callerRole: currentUser?.role,
          callerId: currentUser?.id,
        }),
      });

      const createdUser = res.ok && res.data?.user ? res.data.user : newAccount;
      if (finalGroup) {
        createdUser.studentGroup = finalGroup;
      }
      if (roleToAssign === 'STUDENT' && newUserClass.trim()) {
        createdUser.schoolClass = newUserClass.trim();
      }

      await saveUserToCloud(createdUser);

      setAllUsers((prev) => {
        const next = [createdUser, ...prev.filter((u) => u.id !== createdUser.id)];
        try {
          localStorage.setItem('falthjalp_shared_users', JSON.stringify(next));
        } catch {}
        return next;
      });

      setNewUserName('');
      setNewUserEmail('');
      setNewUserPassword('1234');
      setNewUserCustomGroup('');
      setSuccessMsg(
        `Kontot för ${createdUser.displayName} (${getRoleRankLabel(createdUser.role)}${
          createdUser.studentGroup ? ` • ${createdUser.studentGroup}` : ''
        }) har skapats!`
      );
      setActiveSubTab('ACCOUNTS');
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Ett fel uppstod vid skapande av konto.');
    } finally {
      setIsCreating(false);
    }
  };

  const openEditUserModal = (user: UserAccount) => {
    if (!canEditUser(currentUser, user)) {
      setErrorMsg(
        'Du har inte behörighet (rank) att redigera detta konto. Lärare kan ändra elever, medan Skoladmin/Huvudadmin kan ändra alla.'
      );
      setTimeout(() => setErrorMsg(null), 4000);
      return;
    }
    setEditingUser(user);
    setEditName(user.displayName);
    setEditEmail(user.email);
    setEditPassword(user.password || '1234');
    setEditGroup(user.studentGroup || 'Byggprogrammet (BA)');
    setEditCustomGroup('');
    setEditSchoolClass(user.schoolClass || '');
    setEditSchool(user.schoolOrCompany || '');
    setEditRole(user.role);
    setEditTeacherId(user.teacherId || '');
    setEditNotes(user.notes || '');
  };

  const handleSaveEditedUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;

    if (!canEditUser(currentUser, editingUser)) {
      setErrorMsg('Du saknar behörighet att redigera detta konto.');
      return;
    }

    setIsSavingEdit(true);
    setErrorMsg(null);

    const finalRole: UserRole = isAdmin && canChangeRoleTo(currentUser, editRole) ? editRole : editingUser.role;
    const finalGroup =
      finalRole === 'STUDENT'
        ? editGroup === '__CUSTOM__'
          ? editCustomGroup.trim() || 'Allmän grupp'
          : editGroup
        : undefined;

    if (finalGroup && !STANDARD_STUDENT_GROUPS.includes(finalGroup) && !customGroups.includes(finalGroup)) {
      const updatedGroups = [...customGroups, finalGroup];
      setCustomGroups(updatedGroups);
      await saveCustomStudentGroupsToCloud(updatedGroups);
    }

    const updatedUser: UserAccount = {
      ...editingUser,
      displayName: editName.trim() || editingUser.displayName,
      email: editEmail.trim() || editingUser.email,
      password: editPassword.trim() || editingUser.password || '1234',
      role: finalRole,
      studentGroup: finalGroup,
      schoolClass: finalRole === 'STUDENT' ? editSchoolClass.trim() || undefined : undefined,
      schoolOrCompany: editSchool.trim() || editingUser.schoolOrCompany,
      teacherId: finalRole === 'STUDENT' ? editTeacherId || editingUser.teacherId : undefined,
      notes: editNotes.trim() || undefined,
    };

    try {
      await safeFetchJson('/api/users/update-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: updatedUser.id,
          newPassword: updatedUser.password,
          callerRole: currentUser?.role,
          callerId: currentUser?.id,
        }),
      });

      await saveUserToCloud(updatedUser);

      setAllUsers((prev) => {
        const next = prev.map((u) => (u.id === updatedUser.id ? updatedUser : u));
        try {
          localStorage.setItem('falthjalp_shared_users', JSON.stringify(next));
        } catch {}
        return next;
      });

      // If the user edited their own account, update session too
      if (currentUser && currentUser.id === updatedUser.id) {
        onUserLoggedIn(updatedUser);
      }

      setSuccessMsg(`Uppgifterna för ${updatedUser.displayName} (${getRoleRankLabel(updatedUser.role)}) har sparats!`);
      setEditingUser(null);
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch {
      setErrorMsg('Kunde inte spara ändringarna.');
    } finally {
      setIsSavingEdit(false);
    }
  };

  // Inline quick group change on student row
  const handleQuickChangeStudentGroup = async (student: UserAccount, newGroup: string) => {
    if (!canEditUser(currentUser, student)) return;
    const updated: UserAccount = {
      ...student,
      studentGroup: newGroup,
    };
    await saveUserToCloud(updated);
    setAllUsers((prev) => {
      const next = prev.map((u) => (u.id === updated.id ? updated : u));
      try {
        localStorage.setItem('falthjalp_shared_users', JSON.stringify(next));
      } catch {}
      return next;
    });
    setSuccessMsg(`${student.displayName} flyttades till gruppen "${newGroup}".`);
    setTimeout(() => setSuccessMsg(null), 3000);
  };

  // Bulk assign students to group from StudentGroupsManagerPanel
  const handleBulkAssignGroup = async (userIds: string[], targetGroup: string) => {
    const updatedList = allUsers.map((u) => {
      if (userIds.includes(u.id) && canEditUser(currentUser, u)) {
        return { ...u, studentGroup: targetGroup };
      }
      return u;
    });

    setAllUsers(updatedList);
    try {
      localStorage.setItem('falthjalp_shared_users', JSON.stringify(updatedList));
    } catch {}

    for (const uid of userIds) {
      const found = updatedList.find((u) => u.id === uid);
      if (found && canEditUser(currentUser, found)) {
        await saveUserToCloud(found);
      }
    }

    setSuccessMsg(`${userIds.length} elever har sorterats in i gruppen "${targetGroup}"!`);
    setTimeout(() => setSuccessMsg(null), 3500);
  };

  const handleUpdatePassword = async (userId: string) => {
    const targetUser = allUsers.find((u) => u.id === userId);
    if (!targetUser || !canEditUser(currentUser, targetUser)) {
      setErrorMsg('Du saknar behörighet att ändra lösenordet för detta konto.');
      return;
    }

    if (!newPasswordVal.trim()) return;
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      await safeFetchJson('/api/users/update-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          newPassword: newPasswordVal.trim(),
          callerRole: currentUser?.role,
          callerId: currentUser?.id,
        }),
      });

      const updated = { ...targetUser, password: newPasswordVal.trim() };
      await saveUserToCloud(updated);

      setAllUsers((prev) => {
        const next = prev.map((u) => (u.id === userId ? updated : u));
        try {
          localStorage.setItem('falthjalp_shared_users', JSON.stringify(next));
        } catch {}
        return next;
      });
      setEditingPasswordUserId(null);
      setNewPasswordVal('');
      setSuccessMsg('Lösenordet har uppdaterats!');
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch {
      setErrorMsg('Nätverksfel vid uppdatering av lösenord.');
    }
  };

  const handleDeleteUser = async (userId: string) => {
    const targetUser = allUsers.find((u) => u.id === userId);
    if (!targetUser) return;

    if (!canDeleteUser(currentUser, targetUser)) {
      setErrorMsg('Du kan endast ta bort konton som ligger under din egen rank.');
      setTimeout(() => setErrorMsg(null), 4000);
      return;
    }

    try {
      await safeFetchJson(
        `/api/users/${userId}?callerRole=${currentUser?.role || ''}&callerId=${currentUser?.id || ''}`,
        { method: 'DELETE' }
      );
      await deleteUserFromCloud(userId);
      setAllUsers((prev) => {
        const next = prev.filter((u) => u.id !== userId);
        try {
          localStorage.setItem('falthjalp_shared_users', JSON.stringify(next));
        } catch {}
        return next;
      });
      setSuccessMsg(`Kontot för ${targetUser.displayName} har raderats.`);
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch {
      setErrorMsg('Kunde inte ta bort användaren.');
    }
  };

  // Collect all unique student groups
  const allAvailableGroups = Array.from(
    new Set([
      ...STANDARD_STUDENT_GROUPS,
      ...customGroups,
      ...allUsers.map((u) => u.studentGroup).filter((g): g is string => !!g),
    ])
  );

  const allTeachers = allUsers.filter((u) => u.role === 'TEACHER' || u.role === 'SCHOOL_ADMIN' || u.role === 'ADMIN');

  // Filter and sort users
  const filteredUsers = allUsers
    .filter((u) => {
      if (activeFilter !== 'ALL' && u.role !== activeFilter) return false;
      if (selectedGroupFilter !== 'ALL') {
        if (selectedGroupFilter === '__UNASSIGNED__') {
          if (u.role !== 'STUDENT' || u.studentGroup) return false;
        } else if (u.studentGroup !== selectedGroupFilter) {
          return false;
        }
      }
      if (!searchTerm.trim()) return true;
      const q = searchTerm.toLowerCase();
      return (
        u.displayName.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        (u.schoolOrCompany && u.schoolOrCompany.toLowerCase().includes(q)) ||
        (u.studentGroup && u.studentGroup.toLowerCase().includes(q)) ||
        (u.schoolClass && u.schoolClass.toLowerCase().includes(q))
      );
    })
    .sort((a, b) => {
      if (sortOrder === 'NAME_ASC') return a.displayName.localeCompare(b.displayName, 'sv');
      if (sortOrder === 'NAME_DESC') return b.displayName.localeCompare(a.displayName, 'sv');
      if (sortOrder === 'RANK_DESC') return getRoleRank(b.role) - getRoleRank(a.role);
      if (sortOrder === 'CLASS') {
        return (a.schoolClass || 'ÖÖÖ').localeCompare(b.schoolClass || 'ÖÖÖ', 'sv');
      }
      if (sortOrder === 'GROUP') {
        const ga = a.studentGroup || (a.role !== 'STUDENT' ? '00_Personal' : 'ÖÖÖ_Ingen grupp');
        const gb = b.studentGroup || (b.role !== 'STUDENT' ? '00_Personal' : 'ÖÖÖ_Ingen grupp');
        const cmp = ga.localeCompare(gb, 'sv');
        if (cmp !== 0) return cmp;
        return a.displayName.localeCompare(b.displayName, 'sv');
      }
      if (sortOrder === 'LAST_LOGIN') {
        return (b.lastLogin || '').localeCompare(a.lastLogin || '');
      }
      if (sortOrder === 'NEWEST') {
        return (b.createdAt || '').localeCompare(a.createdAt || '');
      }
      return 0;
    });

  const totalStudents = allUsers.filter((u) => u.role === 'STUDENT').length;
  const totalTeachers = allUsers.filter((u) => u.role === 'TEACHER').length;
  const totalAdmins = allUsers.filter((u) => u.role === 'ADMIN' || u.role === 'SCHOOL_ADMIN').length;

  const getRoleBadgeStyle = (role: UserRole) => {
    switch (role) {
      case 'ADMIN':
        return 'bg-purple-950/90 text-purple-300 border-purple-700/80';
      case 'SCHOOL_ADMIN':
        return 'bg-amber-950/90 text-amber-300 border-amber-700/80';
      case 'TEACHER':
        return 'bg-sky-950/90 text-sky-300 border-sky-700/80';
      default:
        return 'bg-emerald-950/90 text-emerald-300 border-emerald-700/80';
    }
  };

  // ============================================================================
  // VIEW WHEN NOT LOGGED IN AS TEACHER / ADMIN (E.G. STUDENT OR LOGGED OUT)
  // ============================================================================
  if (!canManageAccounts) {
    return (
      <div className="max-w-xl mx-auto px-4 py-8 pb-28 space-y-6 font-sans">
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={onBack}
            className="min-h-[42px] px-3.5 bg-[#1e1e1e] hover:bg-[#282828] text-slate-300 hover:text-white border border-[#333333] font-bold text-xs rounded-xl flex items-center gap-1.5 cursor-pointer transition-colors"
          >
            <ArrowLeft className="w-4 h-4 text-orange-400" />
            <span>Tillbaka till övningar</span>
          </button>
        </div>

        {/* STUDENT READ-ONLY PROFILE CARD */}
        {isStudent && currentUser && !showTeacherLoginForm && (
          <div className="bg-[#181818] border-2 border-[#2c2c2c] rounded-3xl p-6 sm:p-8 space-y-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-[#262626] pb-5">
              <div className="flex items-center gap-3.5">
                <div className="w-14 h-14 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center justify-center shrink-0">
                  <GraduationCap className="w-7 h-7 stroke-[2.2]" />
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[10px] font-black uppercase tracking-wider bg-emerald-950 text-emerald-300 border border-emerald-800 px-2.5 py-0.5 rounded-full">
                      {getRoleRankLabel(currentUser.role)}
                    </span>
                    <span className="text-[10px] font-black uppercase tracking-wider bg-amber-950/80 text-amber-300 border border-amber-700/60 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                      <Lock className="w-3 h-3" /> Låst för egen redigering
                    </span>
                  </div>
                  <h2 className="text-xl sm:text-2xl font-black text-white mt-1">
                    {currentUser.displayName}
                  </h2>
                  <p className="text-xs text-slate-400 font-mono">{currentUser.email}</p>
                </div>
              </div>
            </div>

            {/* Locked Student Details Notice */}
            <div className="p-4 rounded-2xl bg-amber-950/30 border border-amber-500/40 flex items-start gap-3">
              <Lock className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
              <div className="text-xs text-amber-200/90 space-y-1 leading-relaxed">
                <span className="font-black text-amber-300 block">
                  Elevkonton (Rank 1) är skrivskyddade
                </span>
                Som elev kan du inte ändra namn, lösenord, klass eller grupptillhörighet på ditt eget konto. Kontakta din <strong>Yrkeslärare (Rank 2)</strong> eller <strong>Skoladmin (Rank 3–4)</strong> om något behöver ändras.
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="p-3.5 rounded-2xl bg-[#121212] border border-[#262626]">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                  Grupp / Utbildningsinriktning
                </span>
                <span className="font-black text-white text-sm mt-1 block">
                  {currentUser.studentGroup || 'Ej tilldelad grupp ännu'}
                </span>
              </div>
              <div className="p-3.5 rounded-2xl bg-[#121212] border border-[#262626]">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                  Klass / Beteckning
                </span>
                <span className="font-black text-white text-sm mt-1 block">
                  {currentUser.schoolClass || currentUser.schoolOrCompany || 'Bygg & Anläggning'}
                </span>
              </div>
            </div>

            <div className="pt-2 flex flex-col sm:flex-row gap-2.5">
              <button
                type="button"
                onClick={() => setShowTeacherLoginForm(true)}
                className="flex-1 min-h-[44px] bg-[#222222] hover:bg-[#2c2c2c] text-orange-400 border border-orange-500/30 font-bold text-xs rounded-xl flex items-center justify-center gap-2 cursor-pointer transition-colors"
              >
                <ShieldCheck className="w-4 h-4" />
                <span>Byt till Lärar- eller Adminkonto</span>
              </button>

              <button
                type="button"
                onClick={onUserLoggedOut}
                className="min-h-[44px] px-5 bg-rose-950/40 hover:bg-rose-950/80 text-rose-300 border border-rose-900/60 font-bold text-xs rounded-xl flex items-center justify-center cursor-pointer transition-colors"
              >
                Logga ut från elevkontot
              </button>
            </div>
          </div>
        )}

        {/* Admin / Teacher Login Form */}
        {(!isStudent || showTeacherLoginForm) && (
          <div className="bg-[#181818] border-2 border-orange-500/50 rounded-3xl p-6 sm:p-8 space-y-6 shadow-2xl shadow-black/80">
            <div className="text-center space-y-2">
              <div className="w-14 h-14 rounded-2xl bg-orange-500/20 text-orange-400 border border-orange-500/40 flex items-center justify-center mx-auto">
                <ShieldCheck className="w-7 h-7 stroke-[2.2]" />
              </div>
              <h2 className="text-2xl font-black text-white tracking-tight">
                Lärar- & Admininloggning
              </h2>
              <p className="text-xs sm:text-sm text-slate-400 max-w-md mx-auto leading-relaxed">
                Logga in som <strong>Yrkeslärare (Rank 2)</strong>, <strong>Skoladmin (Rank 3)</strong> eller <strong>Huvudadmin (Rank 4)</strong> för att redigera konton under din rank, sortera elevgrupper och skapa övningar.
              </p>
            </div>

            {adminLoginError && (
              <div className="p-3.5 bg-rose-950/80 border border-rose-500/80 rounded-2xl flex items-start gap-2.5 text-rose-200 text-xs">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <div className="leading-relaxed">{adminLoginError}</div>
              </div>
            )}

            {/* Quick Demo Login Buttons for Testing Rank Hierarchy */}
            <div className="p-3.5 rounded-2xl bg-[#121212] border border-[#2a2a2a] space-y-2">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
                Snabbinloggning för olika behörighetsranker:
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => handleAdminLoginSubmit(undefined, 'angfar@skola.se', '1234')}
                  className="p-2.5 rounded-xl bg-sky-950/40 hover:bg-sky-900/50 border border-sky-700/50 text-left cursor-pointer transition-all"
                >
                  <span className="text-[10px] font-black text-sky-400 block">RANK 2 • LÄRARE</span>
                  <span className="text-xs font-bold text-white block">Yrkeslärare Angfar</span>
                  <span className="text-[10px] text-slate-400">Kan ändra alla elever</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleAdminLoginSubmit(undefined, 'skoladmin@skola.se', '1234')}
                  className="p-2.5 rounded-xl bg-amber-950/40 hover:bg-amber-900/50 border border-amber-700/50 text-left cursor-pointer transition-all"
                >
                  <span className="text-[10px] font-black text-amber-400 block">RANK 3 • SKOLADMIN</span>
                  <span className="text-xs font-bold text-white block">Skoladmin</span>
                  <span className="text-[10px] text-slate-400">Kan ändra ALLT</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleAdminLoginSubmit(undefined, 'admin@faltkoll.se', 'admin123')}
                  className="p-2.5 rounded-xl bg-purple-950/40 hover:bg-purple-900/50 border border-purple-700/50 text-left cursor-pointer transition-all"
                >
                  <span className="text-[10px] font-black text-purple-300 block">RANK 4 • HUVUDADMIN</span>
                  <span className="text-xs font-bold text-white block">Huvudadmin</span>
                  <span className="text-[10px] text-slate-400">Kan ändra ALLT</span>
                </button>
              </div>
            </div>

            <form onSubmit={(e) => handleAdminLoginSubmit(e)} className="space-y-4 pt-1">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300 block uppercase tracking-wider">
                  E-postadress eller användarnamn:
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={adminEmail}
                    onChange={(e) => setAdminEmail(e.target.value)}
                    placeholder="T.ex. Angfar, skoladmin eller admin@faltkoll.se"
                    className="w-full min-h-[48px] px-4 pl-10 bg-[#121212] border border-[#333333] focus:border-orange-500 rounded-xl text-sm text-white placeholder:text-slate-500 outline-none transition-colors"
                  />
                  <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300 block uppercase tracking-wider">
                  Lösenord:
                </label>
                <div className="relative">
                  <input
                    type={showAdminPassword ? 'text' : 'password'}
                    value={adminPassword}
                    onChange={(e) => setAdminPassword(e.target.value)}
                    placeholder="Lösenord..."
                    className="w-full min-h-[48px] px-4 pl-10 pr-10 bg-[#121212] border border-[#333333] focus:border-orange-500 rounded-xl text-sm text-white placeholder:text-slate-500 outline-none transition-colors"
                  />
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <button
                    type="button"
                    onClick={() => setShowAdminPassword(!showAdminPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white cursor-pointer"
                    tabIndex={-1}
                  >
                    {showAdminPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoggingInAdmin}
                className="w-full min-h-[50px] bg-orange-500 hover:bg-orange-400 active:scale-95 text-black font-black text-sm rounded-xl flex items-center justify-center gap-2 cursor-pointer transition-all shadow-lg shadow-orange-500/20"
              >
                {isLoggingInAdmin ? (
                  <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <Key className="w-4 h-4 stroke-[2.5]" />
                    <span>Logga in</span>
                  </>
                )}
              </button>

              {showTeacherLoginForm && isStudent && (
                <button
                  type="button"
                  onClick={() => setShowTeacherLoginForm(false)}
                  className="w-full text-center text-xs text-slate-400 hover:text-white pt-2 cursor-pointer"
                >
                  Tillbaka till mitt elevkonto
                </button>
              )}
            </form>
          </div>
        )}
      </div>
    );
  }

  // ============================================================================
  // TEACHER / SCHOOL_ADMIN / MAIN_ADMIN VIEW
  // ============================================================================
  return (
    <div className="max-w-6xl mx-auto px-4 py-6 pb-28 space-y-6 font-sans">
      {/* Top Section Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-[#2c2c2c] pb-5">
        <div className="space-y-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`text-xs font-black uppercase tracking-wider px-3 py-1 rounded-full border ${getRoleBadgeStyle(currentUser.role)}`}>
              Din Rank: {getRoleRankLabel(currentUser.role)}
            </span>
            <span className="text-xs font-bold text-emerald-400 bg-emerald-950/60 px-2.5 py-0.5 rounded-full border border-emerald-800 flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5" />
              {isAdmin ? 'Full Redigeringsrätt (Alla Konton)' : 'Redigeringsrätt för Elever (Rank 1)'}
            </span>
            <span className="text-xs font-bold text-slate-400 bg-[#1e1e1e] px-2.5 py-0.5 rounded-full border border-[#333]">
              {totalStudents} elever • {totalTeachers} lärare • {totalAdmins} admin
            </span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            {isAdmin ? 'Konton, Rank-behörighet & Elevgrupper' : 'Lärarpanel: Elever, Grupper & Övningskreatör'}
          </h1>
          <p className="text-xs sm:text-sm text-slate-400">
            {isAdmin
              ? 'Som Skoladmin / Huvudadmin kan du redigera ALLA registrerade konton, ändra roller/rank, skapa grupper och bygga övningar.'
              : 'Som Lärare (Rank 2) kan du redigera alla elevkonton (Rank 1), sortera elever i grupper (Bygg, Anläggare, Vuxen, Gymnasie m.fl.) och skapa övningar.'}
          </p>
        </div>

        {/* Action Buttons: Kreatörspanel för lärare & Tillbaka */}
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setIsExerciseCreatorOpen(true)}
            className="min-h-[46px] px-4 sm:px-5 bg-orange-500 hover:bg-orange-400 active:scale-95 text-black font-black text-xs sm:text-sm rounded-xl flex items-center gap-2 cursor-pointer shadow-lg shadow-orange-500/25 transition-all"
          >
            <BookOpen className="w-4 h-4 stroke-[2.5]" />
            <span>Kreatörspanel för Lärare (Skapa Övningar)</span>
          </button>

          <button
            type="button"
            onClick={onBack}
            className="min-h-[46px] px-3.5 bg-[#1e1e1e] hover:bg-[#282828] text-slate-300 hover:text-white border border-[#333333] font-bold text-xs rounded-xl flex items-center gap-1.5 cursor-pointer transition-colors"
          >
            <ArrowLeft className="w-4 h-4 text-orange-400" />
            <span>Till övningar</span>
          </button>
        </div>
      </div>

      {/* Rank Hierarchy Info Bar + Quick Switcher for testing */}
      <div className="bg-[#161616] border border-[#2a2a2a] rounded-2xl p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 flex-1">
          <div className={`p-2.5 rounded-xl border ${currentUser.role === 'STUDENT' ? 'bg-emerald-950/50 border-emerald-500' : 'bg-[#121212] border-[#242424]'}`}>
            <span className="text-[10px] font-black uppercase text-emerald-400 block">Rank 1 • Elev</span>
            <span className="text-[11px] text-slate-300 font-semibold block mt-0.5">
              Kan ej ändra sitt eget konto
            </span>
          </div>
          <div className={`p-2.5 rounded-xl border ${currentUser.role === 'TEACHER' ? 'bg-sky-950/50 border-sky-500' : 'bg-[#121212] border-[#242424]'}`}>
            <span className="text-[10px] font-black uppercase text-sky-400 block">Rank 2 • Lärare</span>
            <span className="text-[11px] text-slate-300 font-semibold block mt-0.5">
              Ändrar Elever + Grupper & Övningar
            </span>
          </div>
          <div className={`p-2.5 rounded-xl border ${currentUser.role === 'SCHOOL_ADMIN' ? 'bg-amber-950/50 border-amber-500' : 'bg-[#121212] border-[#242424]'}`}>
            <span className="text-[10px] font-black uppercase text-amber-400 block">Rank 3 • Skoladmin</span>
            <span className="text-[11px] text-slate-300 font-semibold block mt-0.5">
              Kan ändra ALLA konton & roller
            </span>
          </div>
          <div className={`p-2.5 rounded-xl border ${currentUser.role === 'ADMIN' ? 'bg-purple-950/50 border-purple-500' : 'bg-[#121212] border-[#242424]'}`}>
            <span className="text-[10px] font-black uppercase text-purple-300 block">Rank 4 • Huvudadmin</span>
            <span className="text-[11px] text-slate-300 font-semibold block mt-0.5">
              Kan ändra ALLT + Systemlicens
            </span>
          </div>
        </div>

        {/* Role Switcher for Demo/Testing convenience */}
        <div className="flex flex-wrap items-center gap-1.5 shrink-0 border-t lg:border-t-0 lg:border-l border-[#2a2a2a] pt-3 lg:pt-0 lg:pl-4">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mr-1">
            Växla inloggad roll:
          </span>
          <button
            type="button"
            onClick={() => handleAdminLoginSubmit(undefined, 'angfar@skola.se', '1234')}
            className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold cursor-pointer border transition-all ${
              isTeacher
                ? 'bg-sky-500 text-black border-sky-400 font-black'
                : 'bg-[#1e1e1e] text-sky-300 border-[#333] hover:border-sky-500/50'
            }`}
          >
            Lärare (Rank 2)
          </button>
          <button
            type="button"
            onClick={() => handleAdminLoginSubmit(undefined, 'skoladmin@skola.se', '1234')}
            className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold cursor-pointer border transition-all ${
              isSchoolAdmin
                ? 'bg-amber-500 text-black border-amber-400 font-black'
                : 'bg-[#1e1e1e] text-amber-300 border-[#333] hover:border-amber-500/50'
            }`}
          >
            Skoladmin (Rank 3)
          </button>
          <button
            type="button"
            onClick={() => handleAdminLoginSubmit(undefined, 'admin@faltkoll.se', 'admin123')}
            className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold cursor-pointer border transition-all ${
              isMainAdmin
                ? 'bg-purple-500 text-black border-purple-300 font-black'
                : 'bg-[#1e1e1e] text-purple-300 border-[#333] hover:border-purple-500/50'
            }`}
          >
            Huvudadmin (Rank 4)
          </button>
        </div>
      </div>

      {/* Notifications */}
      {successMsg && (
        <div className="p-4 bg-emerald-950/80 border border-emerald-500/80 rounded-2xl flex items-center gap-3 text-emerald-200 text-xs sm:text-sm shadow-lg animate-in fade-in">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="p-4 bg-rose-950/80 border border-rose-500/80 rounded-2xl flex items-center gap-3 text-rose-200 text-xs sm:text-sm shadow-lg animate-in fade-in">
          <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Navigation Sub-Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-[#262626] pb-3">
        <button
          type="button"
          onClick={() => setActiveSubTab('ACCOUNTS')}
          className={`min-h-[44px] px-4 rounded-xl text-xs sm:text-sm font-black flex items-center gap-2 cursor-pointer transition-all ${
            activeSubTab === 'ACCOUNTS'
              ? 'bg-orange-500 text-black shadow-md shadow-orange-500/20'
              : 'bg-[#1a1a1a] text-slate-300 hover:text-white border border-[#2c2c2c]'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Registrerade Konton & Redigering ({allUsers.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('GROUPS')}
          className={`min-h-[44px] px-4 rounded-xl text-xs sm:text-sm font-black flex items-center gap-2 cursor-pointer transition-all ${
            activeSubTab === 'GROUPS'
              ? 'bg-orange-500 text-black shadow-md shadow-orange-500/20'
              : 'bg-[#1a1a1a] text-slate-300 hover:text-white border border-[#2c2c2c]'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Grupper & Sortera Elever ({allAvailableGroups.length} grupper)</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('CREATE')}
          className={`min-h-[44px] px-4 rounded-xl text-xs sm:text-sm font-black flex items-center gap-2 cursor-pointer transition-all ${
            activeSubTab === 'CREATE'
              ? 'bg-orange-500 text-black shadow-md shadow-orange-500/20'
              : 'bg-[#1a1a1a] text-slate-300 hover:text-white border border-[#2c2c2c]'
          }`}
        >
          <Plus className="w-4 h-4" />
          <span>Registrera Nytt Konto</span>
        </button>

        <button
          type="button"
          onClick={() => setIsExerciseCreatorOpen(true)}
          className="min-h-[44px] px-4 rounded-xl text-xs sm:text-sm font-black flex items-center gap-2 cursor-pointer bg-orange-500/15 hover:bg-orange-500/25 text-orange-400 border border-orange-500/40 ml-auto transition-all"
        >
          <BookOpen className="w-4 h-4" />
          <span>Öppna Kreatörspanel (Övningar)</span>
        </button>
      </div>

      {/* =====================================================================
          SUB-TAB 2: GRUPPER & SORTERA ELEVER
         ===================================================================== */}
      {activeSubTab === 'GROUPS' && (
        <StudentGroupsManagerPanel
          allUsers={allUsers}
          customGroups={customGroups}
          onUpdateCustomGroups={setCustomGroups}
          onBulkAssignGroup={handleBulkAssignGroup}
          selectedGroupFilter={selectedGroupFilter}
          onSelectGroupFilter={(grp) => {
            setSelectedGroupFilter(grp);
            setActiveSubTab('ACCOUNTS');
          }}
        />
      )}

      {/* =====================================================================
          SUB-TAB 3: SKAPA NYTT KONTO
         ===================================================================== */}
      {activeSubTab === 'CREATE' && (
        <div className="bg-[#1a1a1a] border border-[#2c2c2c] rounded-3xl p-6 sm:p-7 space-y-5 shadow-xl">
          <div className="flex items-center justify-between border-b border-[#2c2c2c] pb-3">
            <h2 className="text-lg sm:text-xl font-black text-white flex items-center gap-2">
              <Plus className="w-5 h-5 text-orange-400" />
              <span>
                Registrera nytt konto ({isAdmin ? 'Elev, Lärare eller Skoladmin' : 'Elevkonto under din rank'})
              </span>
            </h2>
            <span className="text-xs font-bold text-slate-400">Synkas direkt till molnet</span>
          </div>

          <form onSubmit={handleCreateUser} className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-300">
                För- och efternamn:
              </label>
              <input
                type="text"
                value={newUserName}
                onChange={(e) => setNewUserName(e.target.value)}
                placeholder="T.ex. Johan Lindqvist"
                className="w-full min-h-[44px] px-3.5 bg-[#121212] border border-[#333333] focus:border-orange-500 rounded-xl text-white font-medium text-sm outline-none"
                required
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-300">
                E-post eller Användarnamn:
              </label>
              <input
                type="text"
                value={newUserEmail}
                onChange={(e) => setNewUserEmail(e.target.value)}
                placeholder="T.ex. johan.l@skola.se"
                className="w-full min-h-[44px] px-3.5 bg-[#121212] border border-[#333333] focus:border-orange-500 rounded-xl text-white font-medium text-sm outline-none"
                required
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-300">
                Lösenord:
              </label>
              <input
                type="text"
                value={newUserPassword}
                onChange={(e) => setNewUserPassword(e.target.value)}
                placeholder="T.ex. 1234"
                className="w-full min-h-[44px] px-3.5 bg-[#121212] border border-[#333333] focus:border-orange-500 rounded-xl text-white font-mono text-sm outline-none"
                required
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-300">
                Kontotyp / Rank:
              </label>
              {isAdmin ? (
                <select
                  value={newUserRole}
                  onChange={(e) => setNewUserRole(e.target.value as UserRole)}
                  className="w-full min-h-[44px] px-3.5 bg-[#121212] border border-[#333333] focus:border-orange-500 rounded-xl text-white font-bold text-sm outline-none"
                >
                  <option value="STUDENT">🎓 Elevkonto (Rank 1 — Kan ej ändra eget konto)</option>
                  <option value="TEACHER">👨‍🏫 Yrkeslärare (Rank 2 — Kan ändra elever & övningar)</option>
                  <option value="SCHOOL_ADMIN">🏫 Skoladmin (Rank 3 — Kan ändra ALLT)</option>
                  <option value="ADMIN">🛡️ Huvudadmin (Rank 4 — Kan ändra ALLT)</option>
                </select>
              ) : (
                <div className="min-h-[44px] px-3.5 bg-[#121212] border border-[#2a2a2a] rounded-xl flex items-center text-emerald-400 font-bold text-xs">
                  🎓 Elevkonto (Rank 1 — Lärare skapar elevkonton)
                </div>
              )}
            </div>

            {(!isAdmin || newUserRole === 'STUDENT') && (
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold uppercase tracking-wider text-orange-400">
                    Elevgrupp / Program:
                  </label>
                  <button
                    type="button"
                    onClick={() => setIsNewGroupModalOpen(true)}
                    className="text-[11px] font-bold text-orange-400 hover:text-orange-300 flex items-center gap-1 cursor-pointer"
                  >
                    <FolderPlus className="w-3.5 h-3.5" />
                    <span>+ Ny grupp</span>
                  </button>
                </div>
                <select
                  value={newUserGroup}
                  onChange={(e) => setNewUserGroup(e.target.value)}
                  className="w-full min-h-[44px] px-3.5 bg-[#121212] border border-orange-500/50 focus:border-orange-500 rounded-xl text-white font-bold text-sm outline-none"
                >
                  {allAvailableGroups.map((grp) => (
                    <option key={grp} value={grp}>
                      {grp}
                    </option>
                  ))}
                  <option value="__CUSTOM__">+ Skriv in egen grupp...</option>
                </select>
                {newUserGroup === '__CUSTOM__' && (
                  <input
                    type="text"
                    value={newUserCustomGroup}
                    onChange={(e) => setNewUserCustomGroup(e.target.value)}
                    placeholder="T.ex. Anläggare Vux 2026"
                    className="w-full mt-2 min-h-[40px] px-3 bg-[#121212] border border-orange-500 rounded-xl text-white text-xs outline-none"
                  />
                )}
              </div>
            )}

            {(!isAdmin || newUserRole === 'STUDENT') && (
              <div className="space-y-1">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-300">
                  Klass / Beteckning:
                </label>
                <input
                  type="text"
                  value={newUserClass}
                  onChange={(e) => setNewUserClass(e.target.value)}
                  placeholder="T.ex. BA25-ANL eller VUX-HÖST"
                  className="w-full min-h-[44px] px-3.5 bg-[#121212] border border-[#333333] focus:border-orange-500 rounded-xl text-white font-medium text-sm outline-none"
                />
              </div>
            )}

            <div className="space-y-1">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-300">
                Skola / Enhet:
              </label>
              <input
                type="text"
                value={newUserOrg}
                onChange={(e) => setNewUserOrg(e.target.value)}
                placeholder="T.ex. Bygg- & Anläggningsprogrammet"
                className="w-full min-h-[44px] px-3.5 bg-[#121212] border border-[#333333] focus:border-orange-500 rounded-xl text-white font-medium text-sm outline-none"
              />
            </div>

            <div className="sm:col-span-3 pt-2 flex justify-end">
              <button
                type="submit"
                disabled={isCreating}
                className="min-h-[48px] px-6 bg-orange-500 hover:bg-orange-400 active:scale-95 text-black font-black text-sm rounded-xl flex items-center justify-center gap-2 cursor-pointer transition-all shadow-lg shadow-orange-500/20"
              >
                <Plus className="w-4 h-4 stroke-[3]" />
                <span>{isCreating ? 'Skapar konto...' : 'Skapa & Spara Konto'}</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* =====================================================================
          SUB-TAB 1: REGISTRERADE KONTON & FILTER / SORTERING
         ===================================================================== */}
      {activeSubTab === 'ACCOUNTS' && (
        <div className="bg-[#181818] border border-[#2c2c2c] rounded-3xl p-5 sm:p-7 space-y-5">
          {/* Quick Group Filter Bar (Byggprogrammet, Anläggare, Vuxen, Gymnasie, etc.) */}
          <div className="space-y-2 border-b border-[#262626] pb-4">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-black uppercase tracking-wider text-orange-400 flex items-center gap-1.5">
                <Filter className="w-3.5 h-3.5" />
                <span>Filtrera & Sortera efter Grupp / Utbildning:</span>
              </span>
              <button
                type="button"
                onClick={() => setActiveSubTab('GROUPS')}
                className="text-xs font-bold text-orange-400 hover:text-orange-300 underline cursor-pointer"
              >
                Hantera grupper & mass-sortera elever →
              </button>
            </div>

            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() => setSelectedGroupFilter('ALL')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer border transition-all ${
                  selectedGroupFilter === 'ALL'
                    ? 'bg-orange-500 text-black border-orange-400 font-black'
                    : 'bg-[#121212] text-slate-300 border-[#2c2c2c] hover:border-slate-600'
                }`}
              >
                Alla grupper ({allUsers.length})
              </button>

              {allAvailableGroups.map((grp) => {
                const count = allUsers.filter((u) => u.studentGroup === grp).length;
                return (
                  <button
                    key={grp}
                    type="button"
                    onClick={() => setSelectedGroupFilter(grp)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer border transition-all ${
                      selectedGroupFilter === grp
                        ? 'bg-orange-500 text-black border-orange-400 font-black'
                        : 'bg-[#121212] text-slate-300 border-[#2c2c2c] hover:border-orange-500/40'
                    }`}
                  >
                    {grp} ({count})
                  </button>
                );
              })}
            </div>
          </div>

          {/* Search, Role Filter & Sort Order */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-1.5">
              {(
                [
                  { id: 'ALL', label: `Alla (${allUsers.length})` },
                  { id: 'STUDENT', label: `Elever (${totalStudents})` },
                  { id: 'TEACHER', label: `Lärare (${totalTeachers})` },
                  { id: 'SCHOOL_ADMIN', label: 'Skoladmin' },
                  { id: 'ADMIN', label: 'Huvudadmin' },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveFilter(tab.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer transition-colors ${
                    activeFilter === tab.id
                      ? 'bg-white text-black font-black'
                      : 'bg-[#222222] text-slate-400 hover:text-white'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <select
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value as SortOrder)}
                className="min-h-[40px] px-3 bg-[#121212] border border-[#333333] focus:border-orange-500 rounded-xl text-xs text-slate-200 font-bold outline-none"
              >
                <option value="GROUP">Sortera: Grupp / Inriktning</option>
                <option value="CLASS">Sortera: Klassbeteckning</option>
                <option value="NAME_ASC">Sortera: Namn (A–Ö)</option>
                <option value="NAME_DESC">Sortera: Namn (Ö–A)</option>
                <option value="RANK_DESC">Sortera: Rank (Högst först)</option>
                <option value="LAST_LOGIN">Sortera: Senast inloggad</option>
                <option value="NEWEST">Sortera: Nyast skapad</option>
              </select>

              <div className="relative flex-1 sm:w-64">
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Sök namn, grupp, klass, e-post..."
                  className="w-full min-h-[40px] pl-9 pr-3 bg-[#121212] border border-[#333333] focus:border-orange-500 rounded-xl text-xs text-white outline-none"
                />
                <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              </div>

              <button
                type="button"
                onClick={loadUsers}
                className="min-h-[40px] px-3 bg-[#222] hover:bg-[#2c2c2c] text-slate-300 rounded-xl border border-[#333] flex items-center gap-1.5 text-xs font-bold cursor-pointer"
                title="Uppdatera lista"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-orange-400' : ''}`} />
                <span className="hidden sm:inline">Uppdatera</span>
              </button>
            </div>
          </div>

          {/* Account Rows */}
          <div className="space-y-2.5">
            {filteredUsers.map((u) => {
              const userEditable = canEditUser(currentUser, u);
              const userDeletable = canDeleteUser(currentUser, u);
              const assignedTeacher = u.teacherId ? allTeachers.find((t) => t.id === u.teacherId) : null;

              return (
                <div
                  key={u.id}
                  className={`p-4 rounded-2xl border flex flex-col lg:flex-row lg:items-center justify-between gap-4 transition-colors ${
                    userEditable
                      ? 'bg-[#121212] border-[#292929] hover:border-[#3d3d3d]'
                      : 'bg-[#121212]/60 border-[#222222] opacity-80'
                  }`}
                >
                  <div className="space-y-1.5 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-black text-white text-sm sm:text-base">{u.displayName}</span>

                      <span
                        className={`text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full border ${getRoleBadgeStyle(
                          u.role
                        )}`}
                      >
                        {getRoleRankLabel(u.role)}
                      </span>

                      {u.role === 'STUDENT' && (
                        <span className="text-[10px] font-black px-2.5 py-0.5 rounded-full bg-orange-950/80 text-orange-300 border border-orange-700/70">
                          📂 {u.studentGroup || 'Ingen grupp tilldelad'}
                        </span>
                      )}

                      {u.schoolClass && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#222] text-slate-200 border border-[#383838]">
                          Klass: {u.schoolClass}
                        </span>
                      )}

                      {!userEditable && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#1e1e1e] text-slate-400 border border-[#333] flex items-center gap-1">
                          <Lock className="w-3 h-3 text-slate-400" /> Högre/samma rank (Låst)
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-400">
                      <span className="flex items-center gap-1 font-mono text-slate-300">
                        <Mail className="w-3.5 h-3.5 text-slate-500" /> {u.email}
                      </span>
                      {userEditable && (
                        <span className="flex items-center gap-1 font-mono text-orange-300">
                          <Key className="w-3.5 h-3.5 text-orange-400" /> Lösenord: {u.password || '1234'}
                        </span>
                      )}
                      {u.schoolOrCompany && (
                        <span className="flex items-center gap-1">
                          <Building className="w-3.5 h-3.5 text-slate-500" /> {u.schoolOrCompany}
                        </span>
                      )}
                      {assignedTeacher && (
                        <span className="flex items-center gap-1 text-sky-400 font-semibold">
                          <GraduationCap className="w-3.5 h-3.5" /> Lärare: {assignedTeacher.displayName}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Quick Actions for Editable Accounts */}
                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    {/* Quick Group Dropdown directly on student row */}
                    {u.role === 'STUDENT' && userEditable && (
                      <select
                        value={u.studentGroup || ''}
                        onChange={(e) => handleQuickChangeStudentGroup(u, e.target.value)}
                        className="min-h-[36px] px-2.5 bg-[#1b1b1b] border border-[#363636] hover:border-orange-500/60 rounded-xl text-xs font-bold text-orange-300 outline-none cursor-pointer"
                        title="Byt elevens grupp direkt"
                      >
                        <option value="" disabled>
                          Välj grupp...
                        </option>
                        {allAvailableGroups.map((grp) => (
                          <option key={grp} value={grp}>
                            Grupp: {grp}
                          </option>
                        ))}
                      </select>
                    )}

                    {editingPasswordUserId === u.id ? (
                      <div className="flex items-center gap-1.5">
                        <input
                          type="text"
                          value={newPasswordVal}
                          onChange={(e) => setNewPasswordVal(e.target.value)}
                          placeholder="Nytt lösenord..."
                          className="min-h-[36px] px-2.5 bg-[#1e1e1e] border border-orange-500 rounded-lg text-xs text-white font-mono w-28 outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => handleUpdatePassword(u.id)}
                          className="min-h-[36px] px-3 bg-emerald-500 text-black font-black text-xs rounded-lg cursor-pointer"
                        >
                          Spara
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setEditingPasswordUserId(null);
                            setNewPasswordVal('');
                          }}
                          className="min-h-[36px] px-2.5 bg-[#282828] text-slate-300 text-xs rounded-lg cursor-pointer"
                        >
                          Avbryt
                        </button>
                      </div>
                    ) : (
                      <>
                        {userEditable ? (
                          <>
                            <button
                              type="button"
                              onClick={() => openEditUserModal(u)}
                              className="min-h-[36px] px-3.5 bg-orange-500 hover:bg-orange-400 text-black font-black rounded-xl text-xs flex items-center gap-1.5 cursor-pointer shadow-sm transition-colors"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                              <span>Redigera konto</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                setEditingPasswordUserId(u.id);
                                setNewPasswordVal(u.password || '1234');
                              }}
                              className="min-h-[36px] px-3 bg-[#222222] hover:bg-[#2c2c2c] text-slate-200 border border-[#383838] rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors"
                            >
                              <Key className="w-3.5 h-3.5 text-orange-400" />
                              <span>Lösenord</span>
                            </button>
                          </>
                        ) : (
                          <span className="text-[11px] text-slate-500 italic px-2">
                            Kräver Skoladmin / Huvudadmin
                          </span>
                        )}

                        {userDeletable && (
                          <button
                            type="button"
                            onClick={() => handleDeleteUser(u.id)}
                            className="min-h-[36px] px-2.5 bg-rose-950/60 hover:bg-rose-900/80 text-rose-300 border border-rose-800/60 rounded-xl text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors"
                            title="Ta bort konto"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </div>
              );
            })}

            {filteredUsers.length === 0 && (
              <div className="text-center py-8 text-slate-400 text-sm">
                Inga konton matchade din filtrering.
              </div>
            )}
          </div>
        </div>
      )}

      {/* =====================================================================
          MODAL: REDIGERA KONTO (UNDER DIN RANK ELLER ALLT FÖR ADMIN)
         ===================================================================== */}
      {editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs animate-in fade-in">
          <div className="bg-[#181818] border-2 border-orange-500/50 rounded-3xl max-w-lg w-full p-6 space-y-5 shadow-2xl max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[#2c2c2c] pb-3">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-orange-400 block">
                  Redigerar konto ({getRoleRankLabel(editingUser.role)})
                </span>
                <h3 className="text-lg font-black text-white flex items-center gap-2">
                  <Edit3 className="w-5 h-5 text-orange-400" />
                  <span>{editingUser.displayName}</span>
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setEditingUser(null)}
                className="text-slate-400 hover:text-white text-xs font-bold cursor-pointer px-2.5 py-1 rounded-lg bg-[#242424]"
              >
                Stäng
              </button>
            </div>

            <form onSubmit={handleSaveEditedUser} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div className="space-y-1">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-300">
                    Namn:
                  </label>
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full min-h-[42px] px-3.5 bg-[#121212] border border-[#333333] focus:border-orange-500 rounded-xl text-white text-sm outline-none"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-300">
                    E-post / Användarnamn:
                  </label>
                  <input
                    type="text"
                    value={editEmail}
                    onChange={(e) => setEditEmail(e.target.value)}
                    className="w-full min-h-[42px] px-3.5 bg-[#121212] border border-[#333333] focus:border-orange-500 rounded-xl text-white text-sm outline-none"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-300">
                    Lösenord:
                  </label>
                  <input
                    type="text"
                    value={editPassword}
                    onChange={(e) => setEditPassword(e.target.value)}
                    className="w-full min-h-[42px] px-3.5 bg-[#121212] border border-[#333333] focus:border-orange-500 rounded-xl text-white font-mono text-sm outline-none"
                    required
                  />
                </div>

                {/* Role / Rank Selector — Admins can change ANY role; Teachers see locked role */}
                <div className="space-y-1">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-300">
                    Behörighetsrank / Roll:
                  </label>
                  {isAdmin ? (
                    <select
                      value={editRole}
                      onChange={(e) => setEditRole(e.target.value as UserRole)}
                      className="w-full min-h-[42px] px-3 bg-[#121212] border border-orange-500/50 rounded-xl text-white font-bold text-xs outline-none"
                    >
                      <option value="STUDENT">🎓 Elev (Rank 1)</option>
                      <option value="TEACHER">👨‍🏫 Lärare (Rank 2)</option>
                      <option value="SCHOOL_ADMIN">🏫 Skoladmin (Rank 3)</option>
                      <option value="ADMIN">🛡️ Huvudadmin (Rank 4)</option>
                    </select>
                  ) : (
                    <div className="min-h-[42px] px-3 bg-[#121212] border border-[#2a2a2a] rounded-xl flex items-center text-xs font-bold text-slate-400">
                      {getRoleRankLabel(editingUser.role)} (Endast Skoladmin kan ändra rank)
                    </div>
                  )}
                </div>
              </div>

              {editRole === 'STUDENT' && (
                <div className="p-4 rounded-2xl bg-[#121212] border border-orange-500/30 space-y-3.5">
                  <span className="text-xs font-black uppercase tracking-wider text-orange-400 block">
                    Elevgruppering & Klassindelning
                  </span>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-300 block">
                        Elevgrupp / Utbildning:
                      </label>
                      <select
                        value={editGroup}
                        onChange={(e) => setEditGroup(e.target.value)}
                        className="w-full min-h-[40px] px-3 bg-[#181818] border border-orange-500/50 rounded-xl text-white font-bold text-xs outline-none"
                      >
                        {allAvailableGroups.map((grp) => (
                          <option key={grp} value={grp}>
                            {grp}
                          </option>
                        ))}
                        <option value="__CUSTOM__">+ Skapa ny egen grupp...</option>
                      </select>
                      {editGroup === '__CUSTOM__' && (
                        <input
                          type="text"
                          value={editCustomGroup}
                          onChange={(e) => setEditCustomGroup(e.target.value)}
                          placeholder="Skriv namn på ny grupp..."
                          className="w-full mt-2 min-h-[38px] px-3 bg-[#181818] border border-orange-500 rounded-xl text-white text-xs outline-none"
                        />
                      )}
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-300 block">
                        Klass / Beteckning:
                      </label>
                      <input
                        type="text"
                        value={editSchoolClass}
                        onChange={(e) => setEditSchoolClass(e.target.value)}
                        placeholder="T.ex. BA25-ANL"
                        className="w-full min-h-[40px] px-3 bg-[#181818] border border-[#333] rounded-xl text-white text-xs outline-none"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-300 block">
                      Ansvarig Lärare / Handledare:
                    </label>
                    <select
                      value={editTeacherId}
                      onChange={(e) => setEditTeacherId(e.target.value)}
                      className="w-full min-h-[40px] px-3 bg-[#181818] border border-[#333] rounded-xl text-white text-xs outline-none"
                    >
                      <option value="">-- Välj ansvarig lärare --</option>
                      {allTeachers.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.displayName} ({getRoleRankLabel(t.role)})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              <div className="space-y-1">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-300">
                  Skola / Företag / Enhet:
                </label>
                <input
                  type="text"
                  value={editSchool}
                  onChange={(e) => setEditSchool(e.target.value)}
                  className="w-full min-h-[42px] px-3.5 bg-[#121212] border border-[#333333] focus:border-orange-500 rounded-xl text-white text-sm outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-300">
                  Läraranteckning / Kommentar på konto (valfritt):
                </label>
                <input
                  type="text"
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  placeholder="T.ex. Behöver extra genomgång av laser & avvägning"
                  className="w-full min-h-[42px] px-3.5 bg-[#121212] border border-[#333333] focus:border-orange-500 rounded-xl text-white text-xs outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#2c2c2c]">
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="min-h-[42px] px-4 bg-[#262626] hover:bg-[#333] text-slate-200 font-bold text-xs rounded-xl cursor-pointer"
                >
                  Avbryt
                </button>
                <button
                  type="submit"
                  disabled={isSavingEdit}
                  className="min-h-[42px] px-5 bg-orange-500 hover:bg-orange-400 text-black font-black text-xs rounded-xl cursor-pointer shadow-lg shadow-orange-500/20"
                >
                  {isSavingEdit ? 'Sparar...' : 'Spara alla ändringar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal för att lägga till en ny egen grupp snabbt */}
      {isNewGroupModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs animate-in fade-in">
          <div className="bg-[#181818] border-2 border-orange-500/50 rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#2c2c2c] pb-3">
              <h3 className="text-base font-black text-white flex items-center gap-2">
                <FolderPlus className="w-5 h-5 text-orange-400" />
                <span>Skapa ny elevgrupp / klass</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsNewGroupModalOpen(false)}
                className="text-slate-400 hover:text-white text-xs font-bold cursor-pointer"
              >
                Stäng
              </button>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Skriv namnet på gruppen eller inriktningen (t.ex. <strong>Byggprogrammet Åk 2</strong>, <strong>Anläggare Vux</strong> eller <strong>Gymnasie BA26</strong>).
            </p>
            <input
              type="text"
              value={newGroupNameInput}
              onChange={(e) => setNewGroupNameInput(e.target.value)}
              placeholder="Namn på ny grupp..."
              className="w-full min-h-[44px] px-3.5 bg-[#121212] border border-[#333333] focus:border-orange-500 rounded-xl text-white text-sm outline-none"
              autoFocus
            />
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsNewGroupModalOpen(false)}
                className="min-h-[40px] px-4 bg-[#262626] text-slate-300 font-bold text-xs rounded-xl cursor-pointer"
              >
                Avbryt
              </button>
              <button
                type="button"
                onClick={handleAddNewCustomGroup}
                className="min-h-[40px] px-5 bg-orange-500 hover:bg-orange-400 text-black font-black text-xs rounded-xl cursor-pointer"
              >
                Lägg till grupp
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Teacher Exercise Creator Modal */}
      <TeacherExerciseCreatorModal
        isOpen={isExerciseCreatorOpen}
        onClose={() => setIsExerciseCreatorOpen(false)}
        currentUser={currentUser}
        onStartExerciseProject={(ex) => {
          if (onStartExerciseProject) {
            onStartExerciseProject(ex);
          }
        }}
      />
    </div>
  );
};
