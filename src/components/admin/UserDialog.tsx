import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2, Eye, EyeOff, Copy, RefreshCw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export interface HospitalOption {
  id: string;
  name: string;
}

interface UserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: 'create' | 'edit';
  user?: {
    id: string;
    email: string;
    username?: string;
    first_name?: string | null;
    last_name?: string | null;
    function?: string | null;
    hospital_id?: string | null;
    role: 'admin' | 'viewer' | 'apotheker' | 'super_admin';
    is_physician?: boolean;
    can_add_treatments?: boolean;
    can_delete_treatments?: boolean;
    can_modify_treatments?: boolean;
  } | null;
  onSubmit: (data: Record<string, unknown>) => void;
  isLoading: boolean;
  callerIsSuperAdmin?: boolean;
  hospitals?: HospitalOption[];
  preselectedHospitalId?: string;
}

function generatePassword(length = 12): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%';
  let pw = '';
  for (let i = 0; i < length; i++) {
    pw += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return pw;
}

export function UserDialog({ open, onOpenChange, mode, user, onSubmit, isLoading, callerIsSuperAdmin, hospitals = [], preselectedHospitalId }: UserDialogProps) {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [userFunction, setUserFunction] = useState('');
  const [password, setPassword] = useState('');
  const [hospitalId, setHospitalId] = useState('');
  const [role, setRole] = useState<'admin' | 'viewer' | 'apotheker' | 'super_admin'>('viewer');
  const [sendEmail, setSendEmail] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [canAdd, setCanAdd] = useState(false);
  const [canDelete, setCanDelete] = useState(false);
  const [canModify, setCanModify] = useState(false);
  const [attempted, setAttempted] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      if (mode === 'edit' && user) {
        setEmail(user.email);
        setUsername(user.username || '');
        setFirstName(user.first_name || '');
        setLastName(user.last_name || '');
        setUserFunction(user.function || '');
        setHospitalId(user.hospital_id || '');
        setRole(user.role);
        setPassword('');
        setShowPassword(false);
        setCanAdd(user.can_add_treatments ?? false);
        setCanDelete(user.can_delete_treatments ?? false);
        setCanModify(user.can_modify_treatments ?? false);
      } else {
        setEmail('');
        setUsername('');
        setFirstName('');
        setLastName('');
        setUserFunction('');
        setHospitalId(preselectedHospitalId || '');
        setPassword(generatePassword());
        setRole('viewer');
        setSendEmail(true);
        setShowPassword(true);
        setCanAdd(false);
        setCanDelete(false);
        setCanModify(false);
      }
      setAttempted(false);
    }
  }, [open, mode, user]);

  // Default: verpleegkundige gets no permissions (only on create or when changing function)
  useEffect(() => {
    if (userFunction === 'verpleegkundige' && mode === 'create') {
      setCanAdd(false);
      setCanDelete(false);
      setCanModify(false);
    }
  }, [userFunction, mode]);

  const handleCopyPassword = () => {
    navigator.clipboard.writeText(password);
    toast({ title: t('userDialog.copied'), description: t('userDialog.copiedDesc') });
  };

  const handleSubmit = () => {
    setAttempted(true);
    if (!email.trim() || !username.trim() || !firstName.trim() || !lastName.trim() || !userFunction || !hospitalId) return;

    if (mode === 'create') {
      if (!password.trim()) return;
      onSubmit({
        email: email.trim(),
        username: username.trim(),
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        function: userFunction,
        hospital_id: hospitalId,
        password: password.trim(),
        role,
        send_email: sendEmail,
        login_url: `${window.location.origin}`,
        can_add_treatments: canAdd,
        can_delete_treatments: canDelete,
        can_modify_treatments: canModify,
      });
    } else {
      const changes: Record<string, unknown> = { user_id: user!.id };
      if (email.trim() !== user!.email) changes.email = email.trim();
      if (username.trim() !== (user!.username || '')) changes.username = username.trim();
      if (password.trim()) changes.password = password.trim();
      if (role !== user!.role) changes.role = role;
      changes.first_name = firstName.trim();
      changes.last_name = lastName.trim();
      changes.function = userFunction;
      changes.can_add_treatments = canAdd;
      changes.can_delete_treatments = canDelete;
      changes.can_modify_treatments = canModify;
      changes.hospital_id = hospitalId;

      onSubmit(changes);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {mode === 'create' ? t('userDialog.createTitle') : t('userDialog.editTitle')}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="user-firstname">{t('userDialog.firstName')} *</Label>
              <Input
                id="user-firstname"
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder={t('userDialog.firstNamePlaceholder')}
                required
                className={attempted && !firstName.trim() ? 'border-destructive' : ''}
              />
              {attempted && !firstName.trim() && (
                <p className="text-xs text-destructive">{t('userDialog.firstNameRequired')}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="user-lastname">{t('userDialog.lastName')} *</Label>
              <Input
                id="user-lastname"
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder={t('userDialog.lastNamePlaceholder')}
                required
                className={attempted && !lastName.trim() ? 'border-destructive' : ''}
              />
              {attempted && !lastName.trim() && (
                <p className="text-xs text-destructive">{t('userDialog.lastNameRequired')}</p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="user-function">{t('userDialog.function')} *</Label>
            <Select value={userFunction} onValueChange={setUserFunction}>
              <SelectTrigger className={attempted && !userFunction ? 'border-destructive' : ''}>
                <SelectValue placeholder={t('userDialog.functionPlaceholder')} />
              </SelectTrigger>
              <SelectContent className="bg-popover">
                <SelectItem value="arts">{t('userDialog.functionArts')}</SelectItem>
                <SelectItem value="apotheek">{t('userDialog.functionApotheek')}</SelectItem>
                <SelectItem value="verpleegkundige">{t('userDialog.functionVerpleegkundige')}</SelectItem>
                <SelectItem value="overige">{t('userDialog.functionOverige')}</SelectItem>
              </SelectContent>
            </Select>
            {attempted && !userFunction && (
              <p className="text-xs text-destructive">{t('userDialog.functionRequired')}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="user-hospital">{t('userDialog.hospital')} *</Label>
            <Select value={hospitalId} onValueChange={setHospitalId}>
              <SelectTrigger className={attempted && !hospitalId ? 'border-destructive' : ''}>
                <SelectValue placeholder={t('userDialog.hospitalPlaceholder')} />
              </SelectTrigger>
              <SelectContent className="bg-popover">
                {hospitals.map((h) => (
                  <SelectItem key={h.id} value={h.id}>{h.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {attempted && !hospitalId && (
              <p className="text-xs text-destructive">{t('userDialog.hospitalRequired')}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="user-username">{t('userDialog.username')}</Label>
            <Input
              id="user-username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder={t('userDialog.usernamePlaceholder')}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="user-email">{t('userDialog.email')}</Label>
            <Input
              id="user-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t('userDialog.emailPlaceholder')}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="user-password">
              {mode === 'create' ? t('userDialog.password') : t('userDialog.passwordEdit')}
            </Label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Input
                  id="user-password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={mode === 'edit' ? t('userDialog.passwordEditPlaceholder') : ''}
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <Button type="button" variant="outline" size="icon" onClick={handleCopyPassword} title={t('userDialog.copyPassword')}>
                <Copy className="h-4 w-4" />
              </Button>
            </div>
            {mode === 'create' && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setPassword(generatePassword())}
                className="text-xs gap-1"
              >
                <RefreshCw className="h-3 w-3" />
                {t('userDialog.generatePassword')}
              </Button>
            )}
          </div>

          <div className="space-y-2">
            <Label>{t('userDialog.role')}</Label>
            <Select value={role} onValueChange={(v) => setRole(v as 'admin' | 'viewer' | 'apotheker' | 'super_admin')}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-popover">
                <SelectItem value="viewer">{t('userDialog.roleViewer')}</SelectItem>
                <SelectItem value="apotheker">{t('userDialog.roleApotheker')}</SelectItem>
                <SelectItem value="admin">{t('userDialog.roleAdmin')}</SelectItem>
                {callerIsSuperAdmin && (
                  <SelectItem value="super_admin">{t('userDialog.roleSuperAdmin')}</SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-3 pt-2 border-t">
            <Label className="text-sm font-medium">{t('userDialog.permissions')}</Label>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="can-add"
                checked={canAdd}
                onCheckedChange={(checked) => setCanAdd(checked as boolean)}
              />
              <Label htmlFor="can-add" className="text-sm font-normal cursor-pointer">
                {t('userDialog.canAdd')}
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="can-modify"
                checked={canModify}
                onCheckedChange={(checked) => setCanModify(checked as boolean)}
              />
              <Label htmlFor="can-modify" className="text-sm font-normal cursor-pointer">
                {t('userDialog.canModify')}
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="can-delete"
                checked={canDelete}
                onCheckedChange={(checked) => setCanDelete(checked as boolean)}
              />
              <Label htmlFor="can-delete" className="text-sm font-normal cursor-pointer">
                {t('userDialog.canDelete')}
              </Label>
            </div>
          </div>

          {mode === 'create' && (
            <div className="flex items-center space-x-2 pt-2">
              <Checkbox
                id="send-email"
                checked={sendEmail}
                onCheckedChange={(checked) => setSendEmail(checked as boolean)}
              />
              <Label htmlFor="send-email" className="text-sm font-normal cursor-pointer">
                {t('userDialog.sendEmail')}
              </Label>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t('common.cancel')}
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isLoading || !email.trim() || !username.trim() || !firstName.trim() || !lastName.trim() || !userFunction || !hospitalId || (mode === 'create' && !password.trim())}
          >
            {isLoading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            {mode === 'create' ? t('userDialog.create') : t('common.save')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}