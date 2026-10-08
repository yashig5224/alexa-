import { useQuery } from '@tanstack/react-query';
import { usersApi, type User } from '../services/endpoints';
import { Users, Mail } from 'lucide-react';

function UserCard({ user }: { user: User }) {
  const initials = user.name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase();
  return (
    <div className="card fade-in" style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
      <div style={{
        width: 52, height: 52, borderRadius: '50%',
        background: user.avatarUrl ? `url(${user.avatarUrl}) center/cover` : 'var(--accent-grad)',
        display: 'grid', placeItems: 'center',
        fontWeight: 700, fontSize: 16, color: '#fff',
        flexShrink: 0,
        boxShadow: 'var(--accent-glow)',
      }}>
        {!user.avatarUrl && initials}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontWeight: 600, fontSize: 15 }}>{user.name}</p>
        <p style={{ fontSize: 13, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 4, marginTop: 2 }}>
          <Mail size={11} /> {user.email}
        </p>
      </div>
      <span className={`badge badge-${user.role === 'owner' ? 'info' : 'success'}`}>{user.role}</span>
    </div>
  );
}

export default function TeamPage() {
  const { data: users = [], isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: () => usersApi.list(),
  });

  return (
    <div className="fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Team</h1>
          <p className="page-subtitle">{users.length} members</p>
        </div>
      </div>

      {isLoading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 64 }}>
          <div className="spinner spinner-lg" />
        </div>
      ) : users.length === 0 ? (
        <div className="card empty-state">
          <Users size={40} />
          <p>No team members yet.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxWidth: 640 }}>
          {users.map((u: User) => <UserCard key={u.id} user={u} />)}
        </div>
      )}
    </div>
  );
}
