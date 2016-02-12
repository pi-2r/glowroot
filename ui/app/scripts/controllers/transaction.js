/*
 * Copyright 2013-2016 the original author or authors.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/* global glowroot, angular, moment */

glowroot.controller('TransactionCtrl', [
  '$scope',
  '$location',
  '$timeout',
  'queryStrings',
  'charts',
  'headerDisplay',
  'shortName',
  'defaultSummarySortOrder',
  function ($scope, $location, $timeout, queryStrings, charts, headerDisplay, shortName, defaultSummarySortOrder) {
    // \u00b7 is &middot;
    document.title = headerDisplay + ' \u00b7 Glowroot';
    $scope.$parent.activeNavbarItem = shortName;

    if ($scope.layout.fat) {
      $scope.headerDisplay = headerDisplay;
    } else {
      $scope.headerDisplay = $scope.agentRollup || '<agent>';
    }
    $scope.shortName = shortName;
    $scope.defaultSummarySortOrder = defaultSummarySortOrder;

    $scope.hideAgentRollupDropdown = function () {
      return $scope.layout.agentRollups.length === 1 || $scope.layout.fat;
    };

    $scope.hideTransactionTypeDropdown = function () {
      var agentRollup = $scope.layout.agentRollups[$scope.agentRollup];
      if (!agentRollup) {
        // show empty dropdown
        return false;
      }
      var transactionTypes = agentRollup.transactionTypes;
      if (!transactionTypes) {
        // show empty dropdown
        return false;
      }
      if (transactionTypes.length === 1 && transactionTypes[0] === $scope.transactionType) {
        return true;
      }
      return false;
    };

    $scope.hideMainContent = function () {
      return (!$scope.agentRollup && !$scope.layout.fat) || !$scope.transactionType;
    };

    $scope.headerQueryString = function (agentRollup, transactionType) {
      var agentRollupObj = $scope.layout.agentRollups[agentRollup];
      var query = {};
      if (!$scope.layout.fat) {
        if (agentRollupObj.leaf) {
          query['agent-id'] = agentRollup;
        } else {
          query['agent-rollup'] = agentRollup;
        }
      }
      var transactionTypes = agentRollupObj.transactionTypes;
      if (transactionTypes.length === 0) {
        query['transaction-type'] = '';
      } else if (transactionTypes.indexOf(transactionType) !== -1) {
        query['transaction-type'] = transactionType;
      } else if (transactionTypes.indexOf($scope.layout.defaultTransactionType) !== -1) {
        query['transaction-type'] = $scope.layout.defaultTransactionType;
      } else {
        query['transaction-type'] = transactionTypes[0];
      }

      if ($scope.last) {
        if ($scope.last !== 4 * 60 * 60 * 1000) {
          query.last = $scope.last;
        }
      } else {
        query.from = $scope.chartFrom;
        query.to = $scope.chartTo;
      }
      return queryStrings.encodeObject(query);
    };

    // TODO this is exact duplicate of same function in gauges.js
    $scope.applyLast = function () {
      if (!$scope.last) {
        return;
      }
      var dataPointIntervalMillis = charts.getDataPointIntervalMillis(0, 1.1 * $scope.last);
      var now = moment().startOf('second').valueOf();
      var from = now - $scope.last;
      var to = now + $scope.last / 10;
      var revisedFrom = Math.floor(from / dataPointIntervalMillis) * dataPointIntervalMillis;
      var revisedTo = Math.ceil(to / dataPointIntervalMillis) * dataPointIntervalMillis;
      var revisedDataPointIntervalMillis = charts.getDataPointIntervalMillis(revisedFrom, revisedTo);
      if (revisedDataPointIntervalMillis !== dataPointIntervalMillis) {
        // expanded out to larger rollup threshold so need to re-adjust
        // ok to use original from/to instead of revisedFrom/revisedTo
        revisedFrom = Math.floor(from / revisedDataPointIntervalMillis) * revisedDataPointIntervalMillis;
        revisedTo = Math.ceil(to / revisedDataPointIntervalMillis) * revisedDataPointIntervalMillis;
      }
      $scope.chartFrom = revisedFrom;
      $scope.chartTo = revisedTo;
    };

    function onLocationChangeSuccess() {
      // can't use locationChanges service here because transaction.js covers multiple url paths
      if ($location.path().lastIndexOf('/' + shortName + '/', 0) === -1) {
        return;
      }
      $scope.transactionType = $location.search()['transaction-type'];
      $scope.transactionName = $location.search()['transaction-name'];
      $scope.last = Number($location.search().last);
      $scope.chartFrom = Number($location.search().from);
      $scope.chartTo = Number($location.search().to);
      // both from and to must be supplied or neither will take effect
      if (!isNaN($scope.chartFrom) && !isNaN($scope.chartTo)) {
        $scope.last = 0;
      } else if (!$scope.last) {
        $scope.last = 4 * 60 * 60 * 1000;
      }
      $scope.summarySortOrder = $location.search()['summary-sort-order'] || $scope.defaultSummarySortOrder;

      // always re-apply last in order to reflect the latest time
      $scope.applyLast();
    }

    // need to defer listener registration, otherwise captures initial location change sometimes
    $timeout(function () {
      $scope.$on('$locationChangeSuccess', onLocationChangeSuccess);
    });
    onLocationChangeSuccess();

    $scope.$watchGroup(['last', 'chartFrom', 'chartTo', 'summarySortOrder'], function (newValues, oldValues) {
      if (newValues !== oldValues) {
        $location.search($scope.buildQueryObject());
      }
    });

    $scope.tabQueryString = function () {
      return queryStrings.encodeObject($scope.buildQueryObject({}));
    };

    // TODO this is exact duplicate of same function in gauges.js
    $scope.buildQueryObject = function (baseQuery) {
      var query = baseQuery || angular.copy($location.search());
      if (!$scope.layout.fat) {
        var agentRollupObj = $scope.layout.agentRollups[$scope.agentRollup];
        if (agentRollupObj) {
          if (agentRollupObj.leaf) {
            query['agent-id'] = $scope.agentRollup;
          } else {
            query['agent-rollup'] = $scope.agentRollup;
          }
        }
      }
      query['transaction-type'] = $scope.transactionType;
      query['transaction-name'] = $scope.transactionName;
      if (!$scope.last) {
        query.from = $scope.chartFrom;
        query.to = $scope.chartTo;
        delete query.last;
      } else if ($scope.last !== 4 * 60 * 60 * 1000) {
        query.last = $scope.last;
        delete query.from;
        delete query.to;
      }
      if ($scope.summarySortOrder !== $scope.defaultSummarySortOrder) {
        query['summary-sort-order'] = $scope.summarySortOrder;
      } else {
        delete query['summary-sort-order'];
      }
      return query;
    };

    $scope.currentTabUrl = function () {
      return $location.path().substring(1);
    };
  }
]);
