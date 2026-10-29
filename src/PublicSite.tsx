import React, { useEffect, useMemo, useState } from "react";
import {
  Anchor, ArrowDownRight, ArrowRight, ArrowUpRight, Check, ChevronDown,
  Compass, Crosshair, Factory, Flame, LifeBuoy, Menu, Package, Search,
  ShieldCheck, Ship, Sparkles, Wrench, X, Zap
} from "lucide-react";

const categories = [
  { name: "Marine hand tools", detail: "Reliable tools for onboard maintenance.", icon: Wrench, tone: "blue" },
  { name: "Pneumatic & electric tools", detail: "Workshop power for demanding jobs.", icon: Zap, tone: "orange" },
  { name: "Pumps, hoses & valves", detail: "Fluid handling and deck essentials.", icon: Crosshair, tone: "cyan" },
  { name: "Firefighting equipment", detail: "Equipment for emergency readiness.", icon: Flame, tone: "red" },
  { name: "Life-saving & safety", detail: "Safety equipment and crew protection.", icon: LifeBuoy, tone: "green" },
  { name: "Ropes, rigging & fittings", detail: "The essentials for vessel operations.", icon: Anchor, tone: "violet" },
  { name: "Repair & sealing", detail: "Resins, putties, tapes and repair supplies.", icon: ShieldCheck, tone: "gold" },
  { name: "Workshop & maintenance", detail: "Surface preparation and daily upkeep.", icon: Factory, tone: "slate" }
];

const products = [
  { name: "Underwater Repair Putty", code: "Catalogue item", category: "Repair & sealing", tag: "Repair" },
  { name: "Pneumatic Impact Wrench", code: "Catalogue item", category: "Pneumatic & electric tools", tag: "Workshop" },
  { name: "Diaphragm Pump", code: "Catalogue item", category: "Pumps, hoses & valves", tag: "Fluid handling" },
  { name: "Fire Hose Nozzle", code: "Catalogue item", category: "Firefighting equipment", tag: "Safety" },
  { name: "Lifebuoy Light", code: "Catalogue item", category: "Life-saving & safety", tag: "Emergency" },
  { name: "Pilot Ladder Accessories", code: "Catalogue item", category: "Ropes, rigging & fittings", tag: "Deck" },
  { name: "Needle Scaler", code: "Catalogue item", category: "Workshop & maintenance", tag: "Maintenance" },
  { name: "Electric Angle Grinder", code: "Catalogue item", category: "Pneumatic & electric tools", tag: "Power tool" },
  { name: "Air Hose Coupling", code: "Catalogue item", category: "Pumps, hoses & valves", tag: "Fitting" },
  { name: "Steel Putty", code: "Catalogue item", category: "Repair & sealing", tag: "Repair" },
  { name: "Hydrant Spanner", code: "Catalogue item", category: "Firefighting equipment", tag: "Deck safety" },
  { name: "Protective Work Gloves", code: "Catalogue item", category: "Life-saving & safety", tag: "PPE" }
];

const navItems = [["Solutions", "#solutions"], ["Catalogue", "#catalogue"], ["About", "#about"], ["Contact", "#contact"]];

export default function PublicSite() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");
  const [quoteItems, setQuoteItems] = useState<string[]>([]);
  const [quoteOpen, setQuoteOpen] = useState(false);
  const [sent, setSent] = useState(false);

  useEffect(() => {
    document.title = "Comilla Traders | Marine & Industrial Supply";
    const nodes = Array.from(document.querySelectorAll(".reveal"));
    if (!("IntersectionObserver" in window)) {
      nodes.forEach((node) => node.classList.add("is-visible"));
      return;
    }
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12 });
    nodes.forEach((node) => observer.observe(node));
    return () => observer.disconnect();
  }, []);

  const filteredProducts = useMemo(() => products.filter((product) => {
    const matchesCategory = activeCategory === "All" || product.category === activeCategory;
    const text = (product.name + " " + product.category + " " + product.tag).toLowerCase();
    return matchesCategory && text.includes(query.toLowerCase());
  }), [activeCategory, query]);

  const toggleQuote = (name: string) => {
    setQuoteItems((items) => items.includes(name) ? items.filter((item) => item !== name) : [...items, name]);
  };

  const submitQuote = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const body = [
      "COMILLA TRADERS — PRODUCT ENQUIRY",
      "",
      "Name: " + form.get("name"),
      "Company: " + form.get("company"),
      "Email: " + form.get("email"),
      "Phone / WhatsApp: " + form.get("phone"),
      "",
      "Products of interest:",
      ...(quoteItems.length ? quoteItems.map((item) => "- " + item) : ["- Please advise based on the requirement"]),
      "",
      "Requirements: " + form.get("requirements")
    ].join("\n");
    const subject = encodeURIComponent("Product enquiry — Comilla Traders");
    window.location.href = "mailto:comilla@spctnet.com?subject=" + subject + "&body=" + encodeURIComponent(body);
    setSent(true);
  };

  return (
    <div className="ct-site">
      <div className="ct-topline"><span className="ct-status-dot" /> Marine & industrial supply <span className="ct-top-divider">/</span> Built around the needs of working vessels</div>
      <header className="ct-header">
        <a className="ct-brand" href="#top" aria-label="Comilla Traders home">
          <span className="ct-brand-mark"><img src="/comilla-logo.png" alt="" onError={(e) => { e.currentTarget.style.display = "none"; }} /><Anchor size={23} /></span>
          <span><strong>COMILLA <b>TRADERS</b></strong><small>MARINE · INDUSTRIAL · SUPPLY</small></span>
        </a>
        <nav className={menuOpen ? "ct-nav ct-nav-open" : "ct-nav"} aria-label="Main navigation">
          {navItems.map(([label, href]) => <a key={label} href={href} onClick={() => setMenuOpen(false)}>{label}</a>)}
          <button className="ct-nav-cta" onClick={() => { setQuoteOpen(true); setMenuOpen(false); }}>Request a quote <ArrowUpRight size={16} /></button>
        </nav>
        <button className="ct-menu-toggle" onClick={() => setMenuOpen(!menuOpen)} aria-label="Toggle navigation">{menuOpen ? <X /> : <Menu />}</button>
      </header>

      <main id="top">
        <section className="ct-hero">
          <div className="ct-hero-grid" />
          <div className="ct-hero-copy">
            <div className="ct-eyebrow"><span /> SUPPLY THAT KEEPS YOU MOVING</div>
            <h1>Ready for the<br /><em>real world</em> at sea.</h1>
            <p className="ct-hero-lede">Marine equipment, industrial tools and vessel essentials — thoughtfully sourced for the people who keep operations moving.</p>
            <div className="ct-hero-actions">
              <a href="#catalogue" className="ct-button ct-button-primary">Explore the catalogue <ArrowUpRight size={17} /></a>
              <a href="#about" className="ct-text-link">Get to know us <ArrowDownRight size={16} /></a>
            </div>
            <div className="ct-hero-foot"><span className="ct-foot-line" /> Practical supplies. Clear communication. Dependable service.</div>
          </div>
          <div className="ct-hero-art" aria-label="Stylised three-dimensional cargo ship illustration">
            <div className="ct-orbit ct-orbit-one" /><div className="ct-orbit ct-orbit-two" />
            <div className="ct-coordinate ct-coordinate-a">22° 20' N<br />91° 48' E</div>
            <div className="ct-coordinate ct-coordinate-b">MARINE<br />SUPPLY / 01</div>
            <div className="ct-ship-scene">
              <div className="ct-sky-glow" />
              <div className="ct-sun" />
              <div className="ct-cloud ct-cloud-a" /><div className="ct-cloud ct-cloud-b" />
              <div className="ct-water"><div className="ct-water-line line-a" /><div className="ct-water-line line-b" /><div className="ct-water-line line-c" /><div className="ct-water-line line-d" /></div>
              <div className="ct-cargo-ship">
                <div className="ct-container-stack stack-back"><i /><i /><i /><i /><i /><i /></div>
                <div className="ct-container-stack stack-front"><i /><i /><i /><i /><i /><i /></div>
                <div className="ct-bridge"><b /><b /><b /></div>
                <div className="ct-hull"><span>COMILLA</span></div>
              </div>
              <div className="ct-reflection" />
            </div>
            <div className="ct-floating-card"><span className="ct-floating-icon"><Package size={18} /></span><span><strong>Product-first</strong><small>Quote-led sourcing</small></span><ArrowUpRight size={15} /></div>
            <div className="ct-hero-index">01 <span>/</span> 04</div>
          </div>
          <a className="ct-scroll-cue" href="#solutions"><span className="ct-scroll-wheel" /> SCROLL TO EXPLORE</a>
        </section>

        <section className="ct-proofbar">
          <div className="ct-proof-intro">A practical partner for<br /><strong>everyday operations.</strong></div>
          <div className="ct-proof-stat"><strong>176<span>+</span></strong><small>catalogue records<br />ready to organise</small></div>
          <div className="ct-proof-stat"><strong>08</strong><small>product families<br />to explore</small></div>
          <div className="ct-proof-stat"><strong>01<span>—</span></strong><small>clear path to a<br />product enquiry</small></div>
          <div className="ct-proof-note"><Sparkles size={17} /> Built for procurement teams, vessel operators and maintenance professionals.</div>
        </section>

        <section id="solutions" className="ct-section ct-solutions">
          <div className="ct-section-head reveal"><div><div className="ct-eyebrow dark"><span /> WHAT WE HELP YOU SOURCE</div><h2>Essential equipment.<br /><em>Less friction.</em></h2></div><p>From the deck to the workshop, find the product families that support maintenance, safety and day-to-day vessel operations.</p></div>
          <div className="ct-category-grid">
            {categories.map((category, index) => {
              const Icon = category.icon;
              return <button key={category.name} className={"ct-category-card reveal tone-" + category.tone} style={{ transitionDelay: (index % 4) * 70 + "ms" }} onClick={() => { setActiveCategory(category.name); document.querySelector("#catalogue")?.scrollIntoView({ behavior: "smooth" }); }}>
                <div className="ct-category-top"><span className="ct-category-icon"><Icon size={23} /></span><span className="ct-category-number">0{index + 1}</span></div>
                <h3>{category.name}</h3><p>{category.detail}</p><span className="ct-category-link">Explore category <ArrowUpRight size={15} /></span>
                <span className="ct-card-3d" />
              </button>;
            })}
          </div>
        </section>

        <section id="about" className="ct-about">
          <div className="ct-about-image reveal">
            <div className="ct-about-image-inner">
              <div className="ct-about-image-tag"><Anchor size={16} /> AT THE HEART OF THE WORK</div>
              <div className="ct-blueprint-ring ring-one" /><div className="ct-blueprint-ring ring-two" />
              <div className="ct-about-graphic"><Ship size={100} strokeWidth={0.8} /><span>SUPPLY / SERVICE / SUPPORT</span></div>
              <div className="ct-image-caption"><span>01 / MARINE</span><span>BUILT FOR THE DEMANDS OF THE SEA</span></div>
            </div>
          </div>
          <div className="ct-about-copy reveal">
            <div className="ct-eyebrow"><span /> ABOUT COMILLA TRADERS</div>
            <h2>Good supply is<br />part of a <em>good voyage.</em></h2>
            <p>Every operation depends on the right equipment being available when it is needed. Comilla Traders brings marine and industrial product categories together in one clear, enquiry-led catalogue.</p>
            <p>Our approach is straightforward: make products easier to discover, make requirements easier to communicate, and help buyers move from a product search to a useful conversation.</p>
            <div className="ct-about-points"><div><Check size={16} /><span>Product-led catalogue</span></div><div><Check size={16} /><span>Multi-item quote requests</span></div><div><Check size={16} /><span>Clear enquiry workflow</span></div></div>
            <a href="#contact" className="ct-button ct-button-outline">Talk to our team <ArrowUpRight size={16} /></a>
          </div>
        </section>

        <section id="catalogue" className="ct-section ct-catalogue">
          <div className="ct-section-head reveal"><div><div className="ct-eyebrow dark"><span /> FIND WHAT YOU NEED</div><h2>A catalogue built<br />around <em>the job.</em></h2></div><p>Search selected items from the catalogue, filter by product family, and add the items you need to a single quote request. No public prices.</p></div>
          <div className="ct-catalogue-toolbar reveal">
            <label className="ct-search"><Search size={18} /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search tools, pumps, safety equipment..." /><kbd>⌕</kbd></label>
            <div className="ct-filter-wrap"><span>FILTER BY</span><div className="ct-filter-scroll"><button className={activeCategory === "All" ? "active" : ""} onClick={() => setActiveCategory("All")}>All products</button>{categories.map((category) => <button key={category.name} className={activeCategory === category.name ? "active" : ""} onClick={() => setActiveCategory(category.name)}>{category.name}</button>)}</div></div>
          </div>
          <div className="ct-product-grid">
            {filteredProducts.map((product, index) => {
              const selected = quoteItems.includes(product.name);
              return <article key={product.name} className="ct-product-card reveal" style={{ transitionDelay: (index % 4) * 50 + "ms" }}>
                <div className={"ct-product-visual product-visual-" + (index % 4)}><span className="ct-product-tag">{product.tag}</span><div className="ct-product-object"><div className="object-core" /><div className="object-detail" /><div className="object-shadow" /></div><span className="ct-product-visual-code">CT / 0{index + 1}</span></div>
                <div className="ct-product-info"><span className="ct-product-category">{product.category}</span><h3>{product.name}</h3><div className="ct-product-footer"><span>Request specifications</span><button aria-label={selected ? "Remove from quote" : "Add to quote"} className={selected ? "ct-add-product selected" : "ct-add-product"} onClick={() => toggleQuote(product.name)}>{selected ? <Check size={17} /> : <ArrowUpRight size={17} />}</button></div></div>
              </article>;
            })}
          </div>
          {filteredProducts.length === 0 && <div className="ct-empty-state">No preview items match that search. Try another term or select a different product family.</div>}
          <div className="ct-catalogue-bottom"><span>Showing selected examples from the 176-record source catalogue.</span><button className="ct-button ct-button-primary" onClick={() => setQuoteOpen(true)}>Build a quote request <ArrowRight size={16} /> {quoteItems.length > 0 && <b className="ct-quote-count">{quoteItems.length}</b>}</button></div>
        </section>

        <section className="ct-cta-band reveal">
          <div className="ct-cta-orb" /><div className="ct-cta-copy"><div className="ct-eyebrow"><span /> START A CONVERSATION</div><h2>Have a list?<br /><em>Let's source it.</em></h2><p>Tell us what your vessel, workshop or operation needs. Add products to your enquiry or describe your requirement in your own words.</p></div>
          <button className="ct-button ct-button-light" onClick={() => setQuoteOpen(true)}>Request a quotation <ArrowUpRight size={17} /></button>
          <div className="ct-cta-index">CT / 2026</div>
        </section>

        <section id="contact" className="ct-section ct-contact">
          <div className="ct-contact-left reveal"><div className="ct-eyebrow dark"><span /> LET'S GET SPECIFIC</div><h2>Tell us what<br />you <em>need.</em></h2><p>Share a product, part reference or supply requirement. The more detail you can provide, the easier it is to understand the request.</p><div className="ct-contact-note"><Compass size={20} /><span><strong>Made for real procurement workflows</strong><small>One request can include several products and additional notes.</small></span></div></div>
          <div className="ct-contact-card reveal"><div className="ct-contact-card-top"><span>PRODUCT ENQUIRY</span><span>FORM / 01</span></div><h3>Start a quote request</h3><p>We’ll prepare an email with your requirements for you to send to the business.</p><button className="ct-button ct-button-primary ct-full-button" onClick={() => setQuoteOpen(true)}>Open enquiry form <ArrowUpRight size={16} /></button><div className="ct-contact-card-foot"><ShieldCheck size={15} /> No prices shown. No checkout. Just a clear enquiry.</div></div>
        </section>
      </main>

      <footer className="ct-footer"><div className="ct-footer-main"><a className="ct-brand ct-brand-footer" href="#top"><span className="ct-brand-mark"><Anchor size={23} /></span><span><strong>COMILLA <b>TRADERS</b></strong><small>MARINE · INDUSTRIAL · SUPPLY</small></span></a><p>Essential supply for the people<br />who keep operations moving.</p><a href="#top" className="ct-back-top">BACK TO TOP <ArrowUpRight size={14} /></a></div><div className="ct-footer-bottom"><span>© {new Date().getFullYear()} Comilla Traders. All rights reserved.</span><span>Marine & industrial supply</span><a href="/portal">Operations portal <ArrowUpRight size={13} /></a></div></footer>

      {quoteOpen && <div className="ct-modal-backdrop" role="presentation" onMouseDown={(e) => { if (e.target === e.currentTarget) setQuoteOpen(false); }}><section className="ct-quote-modal" role="dialog" aria-modal="true" aria-labelledby="quote-title"><div className="ct-modal-head"><span>COMILLA TRADERS / ENQUIRY</span><button onClick={() => setQuoteOpen(false)} aria-label="Close enquiry form"><X size={20} /></button></div>{sent ? <div className="ct-form-success"><span><Check size={28} /></span><h2>Email draft prepared</h2><p>Your email app should open with the enquiry details. Review the message and send it to complete your request.</p><button className="ct-button ct-button-primary" onClick={() => { setSent(false); setQuoteOpen(false); }}>Done <ArrowRight size={16} /></button><small>If your email app did not open, check your browser’s mail settings.</small></div> : <form onSubmit={submitQuote}><div className="ct-modal-title"><div className="ct-eyebrow dark"><span /> PRODUCT ENQUIRY</div><h2 id="quote-title">Let's talk <em>requirements.</em></h2><p>Tell us a little about your needs. No prices are displayed or requested.</p></div><div className="ct-selected-items"><div><strong>Selected products</strong><span>{quoteItems.length} added</span></div>{quoteItems.length ? <div className="ct-selected-chips">{quoteItems.map((item) => <button type="button" key={item} onClick={() => toggleQuote(item)}>{item} <X size={12} /></button>)}</div> : <p>No products selected yet — you can still describe your requirement below.</p>}</div><div className="ct-form-grid"><label>Your name *<input name="name" required placeholder="Full name" /></label><label>Company / vessel<input name="company" placeholder="Company or vessel name" /></label><label>Email address *<input name="email" type="email" required placeholder="you@company.com" /></label><label>Phone / WhatsApp<input name="phone" type="tel" placeholder="Include country code" /></label><label className="ct-form-wide">What do you need? *<textarea name="requirements" required rows={3} placeholder="Product names, item codes, quantities, delivery location or specifications..." /></label></div><button className="ct-button ct-button-primary ct-full-button" type="submit">Prepare email enquiry <ArrowUpRight size={16} /></button><small className="ct-form-disclaimer">This opens your email app. Please verify the recipient before sending.</small></form>}</section></div>}
    </div>
  );
}
