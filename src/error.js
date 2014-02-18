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
  .config(['$provide', function ($provide) {

    /**
     * Error object to standardize everything
     * @param  {[type]} exception [description]
     * @param  {[type]} cause     [description]
     * @param  {[type]} opts      [description]
     * @return {[type]}           [description]
     */
    function ErrorReport (exception, cause, opts) {
      this.exception = exception;
      this.cause = cause;
      this.opts = opts;
    }

    $provide.decorator('$exceptionHandler', ['$delegate', '$log', 'errorService', function ($delegate, $log, errorService) {

      return function (exception, cause) {
        var errorReport = new ErrorReport(exception, cause);
        errorService.post(errorReport);
        $log.error.apply($log, arguments);
      };

    }]);
  }])


  /**
   * This service handles the posting of errors, and can be decorated by devs
   * to customize the post payload
   */
  .provider('errorService', function() {

    this.postUri = null;
    this.throttle = 5000;

    /**
     * Keep a cache of recent errors so we can do things like debouncing and
     * aggregating errors into a single post
     *
     * @type {Array}
     */
    var errors = [];



    this.$get = ['$injector', function ($injector) {
      var $http, $q, $timeout;
      var isThrottled = false;

      var resolveDependencies = function() {
        $http = $http || $injector.get('$http');
        $q = $q || $injector.get('$q');
        $timeout = $timeout || $injector.get('$timeout');
      };

      return {
        post: function (errorReport) {
          var uri = this.postUri;
          resolveDependencies();
          errors.push(errorReport);

          if (isThrottled) {
            return;
          }

          $timeout(function(){
            $http.post(uri, errors);
            errors = [];
            isThrottled = false;
          }, this.throttle);

          isThrottled = true;

        },
        postUri: this.postUri,
        throttle: this.throttle
      };
    }];

  });
})();
