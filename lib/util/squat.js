module.exports = function (table) {

    return table.toString().replace(/[├──┼──┤]+\n/g, '')

};