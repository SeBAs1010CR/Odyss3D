export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="footer">
      <div className="container footer-inner">
        <img
          src="/images/branding/logo-horizontal.png"
          alt="ODYSS3D"
          className="footer-logo"
        />
        <div className="footer-links">
          <a href="#inicio">Inicio</a>
          <a href="#productos">Productos</a>
          <a href="#servicios">Servicios</a>
          <a href="#nosotros">Nosotros</a>
          <a href="/contacto">Contacto</a>
        </div>
        <div className="footer-contact">
          <span>Impresión 3D · Diseño · Prototipado · Fabricación</span>
        </div>
      </div>
      <div className="container footer-bottom">
        <span>© {year} ODYSS3D</span>
        <span className="footer-zone">Tecnología y fabricación 3D</span>
      </div>
    </footer>
  );
}
