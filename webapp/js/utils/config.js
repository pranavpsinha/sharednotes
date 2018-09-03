const config = {
    server: {
        baseurl: "",
        endpoints: {
            login: "/login",
            register: "/register",
            all: "/all",
            view: "/view",
            create: "/create",
            delete: "/delete",
        }
    },
    client: {
        dependencies: [
            "js/utils/shared-notes-template.js",
        ]
    }
}