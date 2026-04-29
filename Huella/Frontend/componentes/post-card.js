const template = document.createElement("template");
template.innerHTML = `
    <link rel="stylesheet" href="css/styles.css">
    <style>
        :host {
            display: block;
            margin-bottom: 1.5rem;
        }
            
        .pub-card {
            content-visibility: auto;
            contain-intrinsic-size: auto 500px; 
        }

        ::slotted(button) {
            cursor: pointer;
        }
        .pub-card__badge--resolved {
            background-color: #346739;
            color: white;
            display: none;
        }
        .pub-card__badge--resolved.visible {
            display: inline-block;
        }
        #footer-actions {
            display: flex;
            gap: 10px;
            width: 100%;
            margin-top: auto;
        }
        #footer-actions ::slotted(*) {
            flex-grow: 1;
        }
    </style>

    <article class="pub-card" style="height: 100%;">
        <div class="pub-card__header" id="card-header">
            <div style="display:flex; flex-direction:column; gap:5px;">
                <span class="pub-card__badge" id="badge"></span>
                <span class="pub-card__badge pub-card__badge--resolved" id="badge-resolved">Resuelto</span>
            </div>
            <slot name="header-action"></slot>
        </div>

        <div class="pub-card__image-container">
            <img class="pub-card__img" id="pet-img" alt="Mascota" loading="lazy">
        </div>

        <div class="pub-card__content">
            <h3 class="pub-card__title" id="pet-title"></h3>

            <div class="pub-card__attributes">
                <slot name="extra-attributes"></slot>
                <div class="attribute">
                    <img src="imagenes/iconos/icono_raza.png" class="attribute__icon" alt="Color/Raza">
                    <label><b class="attribute__type">Raza:</b> <span id="pet-race"></span></label>
                </div>
                <div class="attribute">
                    <img src="imagenes/iconos/icono_tamaño.png" class="attribute__icon" alt="Color/Raza">
                    <label><b class="attribute__type">Tamaño:</b> <span id="pet-size"></span></label>
                </div>
                <div class="attribute">
                    <img src="imagenes/iconos/icono_fecha.png" class="attribute__icon" alt="Color/Raza">
                    <label><b class="attribute__type">Fecha:</b> <span id="pet-date"></span></label>
                </div>
            </div>

            <div id="footer-actions">
                <slot name="footer-action"></slot>
            </div>
        </div>
    </article>
`;

class PostCard extends HTMLElement {
    constructor() {
        super();
        const shadow = this.attachShadow({ mode: "open" });
        const templateContent = template.content.cloneNode(true);
        shadow.append(templateContent);
    }

    connectedCallback() {
        this.render();
    }

    static get observedAttributes() {
        return ["especie", "raza", "tamaño", "fecha", "imagen", "badge-text", "badge-type", "resolved"];
    }

    attributeChangedCallback(name, oldVal, newVal) {
        if (oldVal !== newVal) {
            this.render();
        }
    }

    render() {
        if (!this.shadowRoot) return;

        const badgeEl = this.shadowRoot.querySelector("#badge");
        const badgeResolvedEl = this.shadowRoot.querySelector("#badge-resolved");
        const headerEl = this.shadowRoot.querySelector("#card-header");
        const imgEl = this.shadowRoot.querySelector("#pet-img");
        const titleEl = this.shadowRoot.querySelector("#pet-title");
        const razaEl = this.shadowRoot.querySelector("#pet-race");
        const tamanioEl = this.shadowRoot.querySelector("#pet-size");
        const fechaEl = this.shadowRoot.querySelector("#pet-date");

        const badgeText = this.getAttribute("badge-text");
        const badgeType = this.getAttribute("badge-type");

        if (badgeText) {
            badgeEl.textContent = badgeText;
            badgeEl.className = `pub-card__badge pub-card__badge--${badgeType || 'active'}`;
            headerEl.style.display = 'flex';
        } else {
            headerEl.style.display = 'none';
        }

        // Badge resuelto — solo visible si resolved="true"
        const isResolved = this.getAttribute("resolved") === "true";
        badgeResolvedEl.classList.toggle('visible', isResolved);

        imgEl.src = this.getAttribute("imagen") || "./imagenes/img_1.png";
        titleEl.textContent = this.getAttribute("especie") || "Mascota";
        razaEl.textContent = this.getAttribute("raza") || "Mestizo";
        tamanioEl.textContent = this.getAttribute("tamaño") || "No disponible";
        fechaEl.textContent = this.getAttribute("fecha") || "No disponible";

        imgEl.style.cursor = 'pointer';
        const pubId = this.getAttribute('pub-id');
        if (pubId) {
            imgEl.onclick = () => window.location.href = `publicacion.html?id=${pubId}`;
        }
    }
}

customElements.define("post-card", PostCard);