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
        this.locationEl = templateContent.querySelector("#pet-location");

        shadow.append(templateContent);
    }

    connectedCallback() {
        this.render();
    }

    static get observedAttributes() {
        return ["especie", "imagen", "badge-text", "badge-type"];
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
    }
}

customElements.define("post-card", PostCard);