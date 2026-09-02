import type { User } from "../../api/types";

interface Props {
  users: User[];
  loading: boolean;
  currentUserId: string;
  onToggleActivity(user: User): Promise<void>;
}

export function UsersView({ users, loading, currentUserId, onToggleActivity }: Props) {
  return (
    <section aria-labelledby="users-title">
      <div className="page-heading-row catalog-heading">
        <div><h1 id="users-title">Users</h1><p>Review roles, activity, and subscription status.</p></div>
      </div>
      <div className="table-frame">
        <table>
          <thead><tr><th>Email</th><th>Role</th><th>Subscription expires</th><th>Status</th><th aria-label="Actions" /></tr></thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id}>
                <td className="primary-cell">{user.email}</td>
                <td>{user.role === "ADMIN" ? "Administrator" : "Subscription L1"}</td>
                <td>{user.subscriptionExpirationDate ? new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(new Date(user.subscriptionExpirationDate)) : "Not applicable"}</td>
                <td><span className={`status ${user.isActive ? "success" : "danger"}`}><i />{user.isActive ? "Active" : "Inactive"}</span></td>
                <td className="action-cell"><button className="row-action" disabled={user.id === currentUserId} onClick={() => onToggleActivity(user)}>{user.isActive ? "Deactivate" : "Activate"}</button></td>
              </tr>
            ))}
          </tbody>
        </table>
        {loading ? <div className="loading-row">Loading users...</div> : null}
      </div>
    </section>
  );
}
