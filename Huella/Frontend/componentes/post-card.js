const template = document.createElement("template");
template.innerHTML = `
    <link rel="stylesheet" href="css/styles.css">
    <style>
        ::slotted(button) {
            cursor: pointer;
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
            <span class="pub-card__badge" id="badge"></span>
            <slot name="header-action"></slot>
        </div>

        <div class="pub-card__image-container">
            <img class="pub-card__img" id="pet-img" alt="Mascota">
        </div>

        <div class="pub-card__content">
            <h3 class="pub-card__title" id="pet-title"></h3>

            <div class="pub-card__attributes">
                <slot name="extra-attributes"></slot>
                <div class="attribute">
                    <img src="imagenes/iconos/icono_huella.png" class="attribute__icon" alt="Color/Raza">
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

        this.badgeEl = templateContent.querySelector("#badge");
        this.headerEl = templateContent.querySelector("#card-header");
        this.imgEl = templateContent.querySelector("#pet-img");
        this.titleEl = templateContent.querySelector("#pet-title");
        this.razaEl = templateContent.querySelector("#pet-race");
        this.tamanioEl = templateContent.querySelector("#pet-size");
        this.fechaEl = templateContent.querySelector("#pet-date");

        shadow.append(templateContent);
    }

    connectedCallback() {
        this.render();
    }

    static get observedAttributes() {
        return ["especie", "raza", "tamaño", "fecha", "imagen", "badge-text", "badge-type"];
    }

    attributeChangedCallback(name, oldVal, newVal) {
        if (oldVal !== newVal) {
            this.render();
        }
    }

    render() {
        if (!this.shadowRoot) return;

        const badgeText = this.getAttribute("badge-text");
        const badgeType = this.getAttribute("badge-type");

        if (badgeText) {
            this.badgeEl.textContent = badgeText;
            this.badgeEl.className = `pub-card__badge pub-card__badge--${badgeType || 'active'}`;
            this.headerEl.style.display = 'flex';
        } else {
            this.headerEl.style.display = 'none';
        }

        this.imgEl.src = this.getAttribute("imagen") || "./imagenes/img_1.png";
        this.titleEl.textContent = this.getAttribute("especie") || "Mascota";
        this.razaEl.textContent = this.getAttribute("raza") || "Mestizo";
        this.tamanioEl.textContent = this.getAttribute("tamaño") || "No disponible";
        this.fechaEl.textContent = this.getAttribute("fecha") || "No disponible";
    }
}

customElements.define("post-card", PostCard);