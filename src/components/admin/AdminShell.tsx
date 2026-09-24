"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import {
  BarChart3,
  Boxes,
  Inbox,
  LayoutDashboard,
  LogOut,
  Menu,
  Package,
  Settings,
  Store,
  Users,
  Wallet,
} from "lucide-react";
import { currentUser, fetchProfile, signOut } from "@/lib/admin/api";
import { cn } from "@/lib/admin/utils";
import { LoadingBlock } from "./ui";

const NAV = [
  { href: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/orders", label: "Pedidos", icon: Package },
  { href: "/admin/customers", label: "Clientes", icon: Users },
  { href: "/admin/products", label: "Productos", icon: Boxes },
  { href: "/admin/ecommerce", label: "Ecommerce", icon: Store },
  { href: "/admin/requests", label: "Solicitudes", icon: Inbox },
  { href: "/admin/statistics", label: "Estadísticas", icon: BarChart3 },
  { href: "/admin/pagos", label: "Pagos", icon: Wallet },
  { href: "/admin/settings", label: "Configuración", icon: Settings },
];

const displayName = (name: string) => {
  const n = name.trim();
  if (!n) return "Admin";
  return n.charAt(0).toUpperCase() + n.slice(1);
};

export default function AdminShell({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [ready, setReady] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const user = await currentUser();
      if (!user) {
        router.replace("/admin/login");
        return;
      }
      const profile = user?.id ? await fetchProfile(user.id) : null;
      if (!mounted) return;
      setName(
        displayName(
          profile?.name ||
            (user.user_metadata?.full_name as string | undefined) ||
            user.email?.split("@")[0] ||
            "Admin"
        )
      );
      setEmail(user.email ?? "");
      setReady(true);
    })();
    return () => {
      mounted = false;
    };
  }, [router]);

  const onLogout = useCallback(async () => {
    if (signingOut) return;
    setSigningOut(true);
    await signOut();
    router.replace("/admin/login");
    router.refresh();
  }, [router, signingOut]);

  const isActive = useCallback(
    (href: string) => pathname === href || pathname.startsWith(`${href}/`),
    [pathname]
  );

  const closeDrawer = useCallback(() => setDrawerOpen(false), []);

  if (!ready) {
    return (
      <div className="admin-root">
        <LoadingBlock />
      </div>
    );
  }

  const sidebar = (mobile: boolean) => (
    <>
      <div className="admin-sidebar-brand">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/images/branding/logo-icon.png?v=2"
          alt="ODYSS3D"
          className="admin-sidebar-logo"
        />
        <div className="admin-sidebar-brand-text">
          <span className="admin-sidebar-brand-name">ODYSS3D</span>
          <span className="admin-sidebar-brand-role">Admin</span>
        </div>
      </div>

      <nav className="admin-nav">
        {NAV.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn("admin-nav-item", isActive(item.href) && "admin-active")}
              onClick={closeDrawer}
            >
              <Icon />
              {item.label}
            </Link>
          );
        })}

        <div className="admin-nav-divider" />

        <Link
          href="/"
          className="admin-nav-item"
          onClick={closeDrawer}
        >
          <Package />
          Ver sitio público
        </Link>
      </nav>

      <div className="admin-sidebar-foot">
        <div className="admin-user-avatar">{name.charAt(0).toUpperCase()}</div>
        <div className="admin-user-info">
          <div className="admin-user-name">{name}</div>
          <div className="admin-user-email">{email}</div>
        </div>
        <button
          className="admin-logout"
          onClick={onLogout}
          disabled={signingOut}
          title="Cerrar sesión"
          aria-label="Cerrar sesión"
        >
          <LogOut />
        </button>
      </div>

      {mobile && (
        <button className="admin-burger" style={{ position: "absolute", top: 16, right: 14 }} onClick={closeDrawer} aria-label="Cerrar menú">
          ✕
        </button>
      )}
    </>
  );

  return (
    <div className="admin-root">
      <div className="admin-shell">
        <aside className="admin-sidebar">{sidebar(false)}</aside>

        {drawerOpen && (
          <div className="admin-drawer-backdrop" onClick={closeDrawer} />
        )}
        <aside className={`admin-drawer ${drawerOpen ? "admin-drawer-open" : ""}`}>
          {sidebar(true)}
        </aside>

        <div className="admin-main">
          <div className="admin-topbar">
            <button
              className="admin-burger"
              onClick={() => setDrawerOpen(true)}
              aria-label="Abrir menú"
            >
              <Menu />
            </button>
            <span className="admin-topbar-name">ODYSS3D</span>
            <span className="admin-topbar-role">Admin</span>
          </div>

          <div className="admin-content">{children}</div>
        </div>
      </div>
    </div>
  );
}