class SharedNotes {
    constructor(title, owner, createdOn, url) {
        this.title = title;
        this.owner = owner;
        this.createdOn = createdOn;
        this.url = url;
    }

    get renderSharedNoteUrl() {
        return this.sharedNoteCard();
    }

    sharedNoteCard() {
        let html = ``;
                
        html += `<div style="margin: 10px auto; width: 80%; height: 55px;">`;
        html +=     `<div data-id="noteUrl" style="width: 100%; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; text-transform: uppercase; cursor: pointer; color: #6161ff; text-decoration: underline;" data-url="${this.url}" title="${this.title}">${this.title}</div><hr>`;
        html +=     `<div class="shared-note-metadata">`;
        html +=         `<div style="float: left; width: 50%; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; font-size: 13px;" title="${this.owner}">${this.owner}</div>`;
        html +=         `<div style="float: left; width: 50%; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; font-size: 13px; text-align: right;">${this.createdOn}</div>`;
        html +=     `</div>`;
        html += `</div><hr>`;

        return html;
    }
}