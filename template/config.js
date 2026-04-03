module.exports = {
  // Used as the SQLite table name — alphanumeric + underscores only
  formName: '{{FORM_NAME}}',

  // Password for /admin and /export.csv
  adminPassword: 'changeme',

  // Define your form fields here.
  // name: must match the HTML input's name attribute
  // type: TEXT, INTEGER, REAL, or JSON
  //   JSON fields are stored as serialized TEXT; use for multi-selects, arrays, objects, etc.
  //   The client should send valid JSON (or a plain string, which gets wrapped automatically).
  // required: server will reject submissions missing required fields
  fields: [
    { name: 'name',    type: 'TEXT', required: true  },
    { name: 'email',   type: 'TEXT', required: true  },
    { name: 'message', type: 'TEXT', required: false },
    // { name: 'interests', type: 'JSON', required: false },  // e.g. ["design","code"]
  ],
}
