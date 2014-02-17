/*
 * angular-error
 *
 * Captures errors and reports them back to a server for inspection
 *
 * (c) 2014 Wes Cruver
 * License: MIT
 */


(function() {

'use strict';

angular.module('cfp.error', [])

  /**
   * Decorate Angular's $exceptionHandler service to easily hook into the log
   * and post the error to an external service
   */
  .config(function ($provide) {
    'use strict';

    /**
     * Keep a cache of recent errors so we can do things like debouncing and
     * aggregating errors into a single post
     *
     * @type {Array}
     */
    var errorCache = [];

    /**
     * Error object to standardize everything
     * @param  {[type]} exception [description]
     * @param  {[type]} cause     [description]
     * @param  {[type]} opts      [description]
     * @return {[type]}           [description]
     */
    function ErrorReport(exception, cause, opts) {
      this.exception = exception;
      this.cause = cause;
      this.opts = opts;
    }

    $provide.decorator('$exceptionHandler', ['$delegate', '$log', 'errorService', function ($delegate, $log, errorService) {

      return function (exception, cause) {
        var errorReport = new ErrorReport(exception, cause);
        errorCache.push(errorReport);
        errorService.post(errorReport);
        $log.error.apply($log, arguments);
      };

    }]);
  })


  /**
   * This service handles the posting of errors, and can be decorated by devs
   * to customize the post payload
   */
  .provider('errorService', function() {
    this.postUri = null;

    this.$get = ['$injector', function ($injector) {
      var $http, $q;

      return {
        post: function (errorReport) {
          $http = $http || $injector.get('$http');
          $q = $q || $injector.get('$q');

          // $http.post(this.postUri, errorReport);
        },
        postUri: this.postUri
      };
    }];

  });
})();
