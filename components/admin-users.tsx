'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Ban,
  Check,
  ChevronLeft,
  ChevronRight,
  KeyRound,
  Loader2,
  Pencil,
  RefreshCw,
  Search,
  Shield,
  ShieldCheck,
  ShieldOff,
  UserRound,
  Users,
} from 'lucide-react'
import { toast } from 'sonner'

import { authClient } from '@/lib/auth-client'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

type UserRecord = {
  id: string
  name: string
  email: string
  image?: string | null
  role?: string | string[] | null
  banned?: boolean | null
  banReason?: string | null
  banExpiresAt?: Date | string | null
  emailVerified?: boolean
  createdAt: Date | string
  updatedAt: Date | string
}

type SearchField = 'name' | 'email'
type SearchOperator = 'contains' | 'starts_with' | 'ends_with'
type SortDirection = 'asc' | 'desc'
type StatusFilter = 'all' | 'active' | 'banned'
type RoleValue = 'admin' | 'user'
type RoleFilter = 'all' | RoleValue

const PAGE_SIZE = 10

function getRole(user: UserRecord) {
  if (Array.isArray(user.role)) {
    return user.role.join(', ')
  }

  return user.role || 'user'
}

function formatDate(value: Date | string | null | undefined) {
  if (!value) return '—'

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return '—'
  }

  return date.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

function getInitials(name: string) {
  return (
    name
      ?.split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join('') || 'U'
  )
}

function getErrorMessage(error: unknown) {
  if (
    error &&
    typeof error === 'object' &&
    'message' in error &&
    typeof error.message === 'string'
  ) {
    return error.message
  }

  return 'Something went wrong. Please try again.'
}

function UserAvatar({ user }: { user: UserRecord }) {
  return (
    <div className="flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary/10 text-sm font-semibold text-primary">
      {user.image ? (
        <img
          src={user.image}
          alt={user.name}
          className="size-full object-cover"
        />
      ) : (
        getInitials(user.name)
      )}
    </div>
  )
}

function RoleBadge({ role }: { role: string }) {
  const isAdmin = role.split(',').includes('admin')

  return (
    <Badge
      variant={isAdmin ? 'default' : 'secondary'}
      className="capitalize"
    >
      {isAdmin ? (
        <ShieldCheck className="mr-1 size-3" />
      ) : (
        <UserRound className="mr-1 size-3" />
      )}
      {role}
    </Badge>
  )
}

function StatusBadge({ banned }: { banned: boolean }) {
  if (banned) {
    return (
      <Badge variant="destructive">
        <ShieldOff className="mr-1 size-3" />
        Banned
      </Badge>
    )
  }

  return (
    <Badge
      variant="outline"
      className="border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
    >
      <Check className="mr-1 size-3" />
      Active
    </Badge>
  )
}

function StatCard({
  label,
  value,
  icon: Icon,
}: {
  label: string
  value: number
  icon: typeof Users
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="mt-2 text-2xl font-semibold tracking-tight">
            {value}
          </p>
        </div>

        <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Icon className="size-5" />
        </div>
      </div>
    </div>
  )
}

function EditUserDialog({
  user,
  open,
  onOpenChange,
  onSuccess,
}: {
  user: UserRecord | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}) {
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (user) {
      setName(user.name)
    }
  }, [user])

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!user || !name.trim()) return

    setLoading(true)

    try {
      const { error } = await authClient.admin.updateUser({
        userId: user.id,
        data: {
          name: name.trim(),
        },
      })

      if (error) {
        throw error
      }

      toast.success('User updated successfully')
      onOpenChange(false)
      onSuccess()
    } catch (error) {
      toast.error(getErrorMessage(error))
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit user</DialogTitle>
          <DialogDescription>
            Update the basic information for this user.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="user-name">Name</Label>
            <Input
              id="user-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Enter user name"
              disabled={loading}
            />
          </div>

          <div className="space-y-2">
            <Label>Email</Label>
            <Input value={user?.email ?? ''} disabled />
            <p className="text-xs text-muted-foreground">
              Email is displayed here but is not changed by this form.
            </p>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>

            <Button type="submit" disabled={loading || !name.trim()}>
              {loading && <Loader2 className="mr-2 size-4 animate-spin" />}
              Save changes
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function ChangeRoleDialog({
  user,
  open,
  onOpenChange,
  onSuccess,
}: {
  user: UserRecord | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}) {
  // FIX 1: typed as the literal union authClient.admin.setRole expects,
  // instead of a bare string.
  const [role, setRole] = useState<RoleValue>('user')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (user) {
      const currentRole = getRole(user)
      const first = currentRole.split(',')[0]
      setRole(first === 'admin' ? 'admin' : 'user')
    }
  }, [user])

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!user) return

    setLoading(true)

    try {
      const { error } = await authClient.admin.setRole({
        userId: user.id,
        role,
      })

      if (error) {
        throw error
      }

      toast.success(`Role changed to ${role}`)
      onOpenChange(false)
      onSuccess()
    } catch (error) {
      toast.error(getErrorMessage(error))
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Change user role</DialogTitle>
          <DialogDescription>
            Choose the role that should be assigned to this user.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <Label>User</Label>
            <div className="rounded-lg border border-border bg-muted/50 p-3">
              <p className="font-medium">{user?.name}</p>
              <p className="text-sm text-muted-foreground">{user?.email}</p>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Role</Label>

            {/* FIX 2: guard against null before calling setRole,
                since Base UI's Select can call onValueChange(null, ...) */}
            <Select
              value={role}
              onValueChange={(value) => {
                if (value === 'admin' || value === 'user') {
                  setRole(value)
                }
              }}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select role" />
              </SelectTrigger>

              <SelectContent>
                <SelectItem value="user">User</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>

            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 size-4 animate-spin" />}
              Update role
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function ChangePasswordDialog({
  user,
  open,
  onOpenChange,
  onSuccess,
}: {
  user: UserRecord | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}) {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!open) {
      setPassword('')
      setConfirmPassword('')
    }
  }, [open])

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!user) return

    if (password.length < 8) {
      toast.error('Password must contain at least 8 characters')
      return
    }

    if (password !== confirmPassword) {
      toast.error('Passwords do not match')
      return
    }

    setLoading(true)

    try {
      const { error } = await authClient.admin.setUserPassword({
        userId: user.id,
        newPassword: password,
      })

      if (error) {
        throw error
      }

      toast.success('Password updated successfully')
      onOpenChange(false)
      onSuccess()
    } catch (error) {
      toast.error(getErrorMessage(error))
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Change password</DialogTitle>
          <DialogDescription>
            Set a new password for {user?.name}.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="new-password">New password</Label>
            <Input
              id="new-password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Enter new password"
              disabled={loading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirm-password">Confirm password</Label>
            <Input
              id="confirm-password"
              type="password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              placeholder="Confirm new password"
              disabled={loading}
            />
          </div>

          <p className="text-xs text-muted-foreground">
            Use at least 8 characters.
          </p>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>

            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 size-4 animate-spin" />}
              Change password
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function BanUserDialog({
  user,
  open,
  onOpenChange,
  onSuccess,
}: {
  user: UserRecord | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}) {
  const [reason, setReason] = useState('')
  const [duration, setDuration] = useState('604800')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!user) return

    setLoading(true)

    try {
      const { error } = await authClient.admin.banUser({
        userId: user.id,
        banReason: reason.trim() || undefined,
        banExpiresIn:
          duration === 'permanent' ? undefined : Number(duration),
      })

      if (error) {
        throw error
      }

      toast.success('User has been banned')
      onOpenChange(false)
      setReason('')
      onSuccess()
    } catch (error) {
      toast.error(getErrorMessage(error))
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Ban user</DialogTitle>
          <DialogDescription>
            This will prevent the user from signing in and revoke their
            existing sessions.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-3">
            <p className="font-medium">{user?.name}</p>
            <p className="text-sm text-muted-foreground">{user?.email}</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="ban-reason">Reason</Label>
            <Input
              id="ban-reason"
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              placeholder="e.g. Suspicious activity"
              disabled={loading}
            />
          </div>

          <div className="space-y-2">
            <Label>Ban duration</Label>

            {/* FIX 3: guard against null before calling setDuration */}
            <Select
              value={duration}
              onValueChange={(value) => {
                if (value !== null) setDuration(value)
              }}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>

              <SelectContent>
                <SelectItem value="86400">24 hours</SelectItem>
                <SelectItem value="604800">7 days</SelectItem>
                <SelectItem value="2592000">30 days</SelectItem>
                <SelectItem value="permanent">Permanent</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>

            <Button
              type="submit"
              variant="destructive"
              disabled={loading}
            >
              {loading && <Loader2 className="mr-2 size-4 animate-spin" />}
              Ban user
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function UnbanDialog({
  user,
  open,
  onOpenChange,
  onSuccess,
}: {
  user: UserRecord | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}) {
  const [loading, setLoading] = useState(false)

  async function handleUnban() {
    if (!user) return

    setLoading(true)

    try {
      const { error } = await authClient.admin.unbanUser({
        userId: user.id,
      })

      if (error) {
        throw error
      }

      toast.success('User has been unbanned')
      onOpenChange(false)
      onSuccess()
    } catch (error) {
      toast.error(getErrorMessage(error))
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Unban user?</DialogTitle>
          <DialogDescription>
            This will allow {user?.name} to sign in again.
          </DialogDescription>
        </DialogHeader>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            Cancel
          </Button>

          <Button onClick={handleUnban} disabled={loading}>
            {loading && <Loader2 className="mr-2 size-4 animate-spin" />}
            Unban user
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export function AdminUsers() {
  const [users, setUsers] = useState<UserRecord[]>([])
  const [total, setTotal] = useState(0)

  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const [search, setSearch] = useState('')
  const [searchField, setSearchField] =
    useState<SearchField>('name')
  const [searchOperator, setSearchOperator] =
    useState<SearchOperator>('contains')

  const [status, setStatus] = useState<StatusFilter>('all')
  const [role, setRole] = useState<RoleFilter>('all')

  const [sortBy, setSortBy] = useState('createdAt')
  const [sortDirection, setSortDirection] =
    useState<SortDirection>('desc')

  const [page, setPage] = useState(1)

  const [selectedUser, setSelectedUser] =
    useState<UserRecord | null>(null)

  const [editOpen, setEditOpen] = useState(false)
  const [roleOpen, setRoleOpen] = useState(false)
  const [passwordOpen, setPasswordOpen] = useState(false)
  const [banOpen, setBanOpen] = useState(false)
  const [unbanOpen, setUnbanOpen] = useState(false)

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  const loadUsers = useCallback(
    async (showRefresh = false) => {
      if (showRefresh) {
        setRefreshing(true)
      } else {
        setLoading(true)
      }

      try {
        const query: Record<string, unknown> = {
          limit: PAGE_SIZE,
          offset: (page - 1) * PAGE_SIZE,
          sortBy,
          sortDirection,
        }

        if (search.trim()) {
          query.searchValue = search.trim()
          query.searchField = searchField
          query.searchOperator = searchOperator
        }

        if (role !== 'all') {
          query.filterField = 'role'
          query.filterValue = role
          query.filterOperator = 'eq'
        } else if (status !== 'all') {
          query.filterField = 'banned'
          query.filterValue = status === 'banned'
          query.filterOperator = 'eq'
        }

        const { data, error } = await authClient.admin.listUsers({
          query,
        })

        if (error) {
          throw error
        }

        setUsers((data?.users ?? []) as UserRecord[])
        setTotal(data?.total ?? 0)
      } catch (error) {
        toast.error(getErrorMessage(error))
        setUsers([])
        setTotal(0)
      } finally {
        setLoading(false)
        setRefreshing(false)
      }
    },
    [
      page,
      role,
      search,
      searchField,
      searchOperator,
      sortBy,
      sortDirection,
      status,
    ],
  )

  useEffect(() => {
    const timer = window.setTimeout(() => {
      loadUsers()
    }, 350)

    return () => window.clearTimeout(timer)
  }, [loadUsers])

  useEffect(() => {
    setPage(1)
  }, [search, searchField, searchOperator, status, role])

  const bannedOnPage = useMemo(
    () => users.filter((user) => user.banned).length,
    [users],
  )

  function openDialog(
    dialog: 'edit' | 'role' | 'password' | 'ban' | 'unban',
    user: UserRecord,
  ) {
    setSelectedUser(user)

    if (dialog === 'edit') setEditOpen(true)
    if (dialog === 'role') setRoleOpen(true)
    if (dialog === 'password') setPasswordOpen(true)
    if (dialog === 'ban') setBanOpen(true)
    if (dialog === 'unban') setUnbanOpen(true)
  }

  function handleMutationSuccess() {
    loadUsers(true)
  }

  function clearFilters() {
    setSearch('')
    setSearchField('name')
    setSearchOperator('contains')
    setStatus('all')
    setRole('all')
    setSortBy('createdAt')
    setSortDirection('desc')
    setPage(1)
  }

  return (
    <main className="min-h-full bg-background">
      <div className="mx-auto w-full max-w-[1600px] space-y-6 p-4 sm:p-6 lg:p-8">
        {/* Header */}
        <section className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2 text-sm text-muted-foreground">
              <Shield className="size-4" />
              Administration
            </div>

            <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
              User management
            </h1>

            <p className="mt-1 text-sm text-muted-foreground">
              Manage users, roles, passwords and account access.
            </p>
          </div>

          <Button
            variant="outline"
            onClick={() => loadUsers(true)}
            disabled={loading || refreshing}
          >
            <RefreshCw
              className={`mr-2 size-4 ${
                refreshing ? 'animate-spin' : ''
              }`}
            />
            Refresh
          </Button>
        </section>

        {/* Stats */}
        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <StatCard
            label="Total users"
            value={total}
            icon={Users}
          />

          <StatCard
            label="Users on this page"
            value={users.length}
            icon={UserRound}
          />

          <StatCard
            label="Banned on this page"
            value={bannedOnPage}
            icon={Ban}
          />
        </section>

        {/* Filters */}
        <section className="rounded-xl border border-border bg-card p-4 sm:p-5">
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-3 lg:flex-row">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />

                <Input
                  value={search}
                  onChange={(event) =>
                    setSearch(event.target.value)
                  }
                  placeholder={`Search by ${searchField}...`}
                  className="pl-9"
                />
              </div>

              <Select
                value={searchField}
                onValueChange={(value) => {
                  if (value === 'name' || value === 'email') {
                    setSearchField(value)
                  }
                }}
              >
                <SelectTrigger className="w-full lg:w-36">
                  <SelectValue />
                </SelectTrigger>

                <SelectContent>
                  <SelectItem value="name">Name</SelectItem>
                  <SelectItem value="email">Email</SelectItem>
                </SelectContent>
              </Select>

              <Select
                value={searchOperator}
                onValueChange={(value) => {
                  if (
                    value === 'contains' ||
                    value === 'starts_with' ||
                    value === 'ends_with'
                  ) {
                    setSearchOperator(value)
                  }
                }}
              >
                <SelectTrigger className="w-full lg:w-40">
                  <SelectValue />
                </SelectTrigger>

                <SelectContent>
                  <SelectItem value="contains">Contains</SelectItem>
                  <SelectItem value="starts_with">
                    Starts with
                  </SelectItem>
                  <SelectItem value="ends_with">
                    Ends with
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              {/* FIX 4: guard against null before calling setRole here too
                  — same bare-setState issue as the other Selects */}
              <Select
                value={role}
                onValueChange={(value) => {
                  if (value === 'all' || value === 'admin' || value === 'user') {
                    setRole(value)
                  }
                }}
              >
                <SelectTrigger className="w-full sm:w-40">
                  <SelectValue placeholder="Role" />
                </SelectTrigger>

                <SelectContent>
                  <SelectItem value="all">All roles</SelectItem>
                  <SelectItem value="user">User</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>

              <Select
                value={status}
                onValueChange={(value) => {
                  if (value === 'all' || value === 'active' || value === 'banned') {
                    setStatus(value)
                  }
                }}
              >
                <SelectTrigger className="w-full sm:w-40">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>

                <SelectContent>
                  <SelectItem value="all">All status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="banned">Banned</SelectItem>
                </SelectContent>
              </Select>

              {/* FIX 5: bail out early if value is null before splitting it */}
              <Select
                value={`${sortBy}:${sortDirection}`}
                onValueChange={(value) => {
                  if (!value) return

                  const [field, direction] = value.split(':')

                  setSortBy(field)
                  setSortDirection(
                    direction as SortDirection,
                  )
                  setPage(1)
                }}
              >
                <SelectTrigger className="w-full sm:w-48">
                  <SelectValue placeholder="Sort" />
                </SelectTrigger>

                <SelectContent>
                  <SelectItem value="createdAt:desc">
                    Newest first
                  </SelectItem>
                  <SelectItem value="createdAt:asc">
                    Oldest first
                  </SelectItem>
                  <SelectItem value="name:asc">
                    Name A–Z
                  </SelectItem>
                  <SelectItem value="name:desc">
                    Name Z–A
                  </SelectItem>
                  <SelectItem value="email:asc">
                    Email A–Z
                  </SelectItem>
                  <SelectItem value="email:desc">
                    Email Z–A
                  </SelectItem>
                </SelectContent>
              </Select>

              <Button
                variant="ghost"
                onClick={clearFilters}
                className="sm:ml-auto"
              >
                Clear filters
              </Button>
            </div>
          </div>
        </section>

        {/* Table */}
        <section className="overflow-hidden rounded-xl border border-border bg-card">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-64">User</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Verified</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">
                    Actions
                  </TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell
                      colSpan={6}
                      className="h-48 text-center"
                    >
                      <div className="flex items-center justify-center gap-2 text-muted-foreground">
                        <Loader2 className="size-4 animate-spin" />
                        Loading users...
                      </div>
                    </TableCell>
                  </TableRow>
                ) : users.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={6}
                      className="h-48 text-center"
                    >
                      <div className="flex flex-col items-center justify-center">
                        <div className="mb-3 flex size-11 items-center justify-center rounded-full bg-muted">
                          <Users className="size-5 text-muted-foreground" />
                        </div>

                        <p className="font-medium">
                          No users found
                        </p>

                        <p className="mt-1 text-sm text-muted-foreground">
                          Try changing your search or filters.
                        </p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  users.map((user) => {
                    const userRole = getRole(user)

                    return (
                      <TableRow key={user.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <UserAvatar user={user} />

                            <div className="min-w-0">
                              <p className="truncate font-medium">
                                {user.name}
                              </p>

                              <p className="truncate text-sm text-muted-foreground">
                                {user.email}
                              </p>
                            </div>
                          </div>
                        </TableCell>

                        <TableCell>
                          <RoleBadge role={userRole} />
                        </TableCell>

                        <TableCell>
                          <StatusBadge banned={Boolean(user.banned)} />
                        </TableCell>

                        <TableCell>
                          {user.emailVerified ? (
                            <span className="inline-flex items-center gap-1 text-sm text-emerald-600 dark:text-emerald-400">
                              <Check className="size-4" />
                              Verified
                            </span>
                          ) : (
                            <span className="text-sm text-muted-foreground">
                              Not verified
                            </span>
                          )}
                        </TableCell>

                        <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                          {formatDate(user.createdAt)}
                        </TableCell>

                        <TableCell>
                          <div className="flex justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              title="Edit user"
                              onClick={() =>
                                openDialog('edit', user)
                              }
                            >
                              <Pencil className="size-4" />
                            </Button>

                            <Button
                              variant="ghost"
                              size="icon"
                              title="Change role"
                              onClick={() =>
                                openDialog('role', user)
                              }
                            >
                              <ShieldCheck className="size-4" />
                            </Button>

                            <Button
                              variant="ghost"
                              size="icon"
                              title="Change password"
                              onClick={() =>
                                openDialog('password', user)
                              }
                            >
                              <KeyRound className="size-4" />
                            </Button>

                            {user.banned ? (
                              <Button
                                variant="ghost"
                                size="icon"
                                title="Unban user"
                                onClick={() =>
                                  openDialog('unban', user)
                                }
                              >
                                <ShieldCheck className="size-4" />
                              </Button>
                            ) : (
                              <Button
                                variant="ghost"
                                size="icon"
                                title="Ban user"
                                className="text-destructive hover:text-destructive"
                                onClick={() =>
                                  openDialog('ban', user)
                                }
                              >
                                <Ban className="size-4" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          <div className="flex flex-col gap-3 border-t border-border px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-muted-foreground">
              {total === 0
                ? 'No users'
                : `Showing ${(page - 1) * PAGE_SIZE + 1}–${Math.min(
                    page * PAGE_SIZE,
                    total,
                  )} of ${total}`}
            </p>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1 || loading}
                onClick={() =>
                  setPage((current) => Math.max(1, current - 1))
                }
              >
                <ChevronLeft className="mr-1 size-4" />
                Previous
              </Button>

              <span className="min-w-20 text-center text-sm">
                Page {page} of {totalPages}
              </span>

              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages || loading}
                onClick={() =>
                  setPage((current) =>
                    Math.min(totalPages, current + 1),
                  )
                }
              >
                Next
                <ChevronRight className="ml-1 size-4" />
              </Button>
            </div>
          </div>
        </section>
      </div>

      {/* Dialogs */}
      <EditUserDialog
        user={selectedUser}
        open={editOpen}
        onOpenChange={setEditOpen}
        onSuccess={handleMutationSuccess}
      />

      <ChangeRoleDialog
        user={selectedUser}
        open={roleOpen}
        onOpenChange={setRoleOpen}
        onSuccess={handleMutationSuccess}
      />

      <ChangePasswordDialog
        user={selectedUser}
        open={passwordOpen}
        onOpenChange={setPasswordOpen}
        onSuccess={handleMutationSuccess}
      />

      <BanUserDialog
        user={selectedUser}
        open={banOpen}
        onOpenChange={setBanOpen}
        onSuccess={handleMutationSuccess}
      />

      <UnbanDialog
        user={selectedUser}
        open={unbanOpen}
        onOpenChange={setUnbanOpen}
        onSuccess={handleMutationSuccess}
      />
    </main>
  )
}