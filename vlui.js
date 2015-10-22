;(function() {
/*!
 * JSON3 with compact stringify -- Modified by Kanit Wongsuphasawat.   https://github.com/kanitw/json3
 *
 * Forked from JSON v3.3.2 | https://bestiejs.github.io/json3 | Copyright 2012-2014, Kit Cambridge | http://kit.mit-license.org
 */
;(function () {
  // Detect the `define` function exposed by asynchronous module loaders. The
  // strict `define` check is necessary for compatibility with `r.js`.
  var isLoader = typeof define === "function" && define.amd;

  // A set of types used to distinguish objects from primitives.
  var objectTypes = {
    "function": true,
    "object": true
  };

  // Detect the `exports` object exposed by CommonJS implementations.
  var freeExports = objectTypes[typeof exports] && exports && !exports.nodeType && exports;

  // Use the `global` object exposed by Node (including Browserify via
  // `insert-module-globals`), Narwhal, and Ringo as the default context,
  // and the `window` object in browsers. Rhino exports a `global` function
  // instead.
  var root = objectTypes[typeof window] && window || this,
      freeGlobal = freeExports && objectTypes[typeof module] && module && !module.nodeType && typeof global == "object" && global;

  if (freeGlobal && (freeGlobal["global"] === freeGlobal || freeGlobal["window"] === freeGlobal || freeGlobal["self"] === freeGlobal)) {
    root = freeGlobal;
  }

  // Public: Initializes JSON 3 using the given `context` object, attaching the
  // `stringify` and `parse` functions to the specified `exports` object.
  function runInContext(context, exports) {
    context || (context = root["Object"]());
    exports || (exports = root["Object"]());

    // Native constructor aliases.
    var Number = context["Number"] || root["Number"],
        String = context["String"] || root["String"],
        Object = context["Object"] || root["Object"],
        Date = context["Date"] || root["Date"],
        SyntaxError = context["SyntaxError"] || root["SyntaxError"],
        TypeError = context["TypeError"] || root["TypeError"],
        Math = context["Math"] || root["Math"],
        nativeJSON = context["JSON"] || root["JSON"];

    // Delegate to the native `stringify` and `parse` implementations.
    if (typeof nativeJSON == "object" && nativeJSON) {
      exports.stringify = nativeJSON.stringify;
      exports.parse = nativeJSON.parse;
    }

    // Convenience aliases.
    var objectProto = Object.prototype,
        getClass = objectProto.toString,
        isProperty, forEach, undef;

    // Test the `Date#getUTC*` methods. Based on work by @Yaffle.
    var isExtended = new Date(-3509827334573292);
    try {
      // The `getUTCFullYear`, `Month`, and `Date` methods return nonsensical
      // results for certain dates in Opera >= 10.53.
      isExtended = isExtended.getUTCFullYear() == -109252 && isExtended.getUTCMonth() === 0 && isExtended.getUTCDate() === 1 &&
        // Safari < 2.0.2 stores the internal millisecond time value correctly,
        // but clips the values returned by the date methods to the range of
        // signed 32-bit integers ([-2 ** 31, 2 ** 31 - 1]).
        isExtended.getUTCHours() == 10 && isExtended.getUTCMinutes() == 37 && isExtended.getUTCSeconds() == 6 && isExtended.getUTCMilliseconds() == 708;
    } catch (exception) {}

    // Internal: Determines whether the native `JSON.stringify` and `parse`
    // implementations are spec-compliant. Based on work by Ken Snyder.
    function has(name) {
      if (has[name] !== undef) {
        // Return cached feature test result.
        return has[name];
      }
      var isSupported;
      if (name == "bug-string-char-index") {
        // IE <= 7 doesn't support accessing string characters using square
        // bracket notation. IE 8 only supports this for primitives.
        isSupported = "a"[0] != "a";
      } else if (name == "json") {
        // Indicates whether both `JSON.stringify` and `JSON.parse` are
        // supported.
        isSupported = has("json-stringify") && has("json-parse");
      } else {
        var value, serialized = '{"a":[1,true,false,null,"\\u0000\\b\\n\\f\\r\\t"]}';
        // Test `JSON.stringify`.
        if (name == "json-stringify") {
          var stringify = exports.stringify, stringifySupported = typeof stringify == "function" && isExtended;
          if (stringifySupported) {
            // A test function object with a custom `toJSON` method.
            (value = function () {
              return 1;
            }).toJSON = value;
            try {
              stringifySupported =
                // Firefox 3.1b1 and b2 serialize string, number, and boolean
                // primitives as object literals.
                stringify(0) === "0" &&
                // FF 3.1b1, b2, and JSON 2 serialize wrapped primitives as object
                // literals.
                stringify(new Number()) === "0" &&
                stringify(new String()) == '""' &&
                // FF 3.1b1, 2 throw an error if the value is `null`, `undefined`, or
                // does not define a canonical JSON representation (this applies to
                // objects with `toJSON` properties as well, *unless* they are nested
                // within an object or array).
                stringify(getClass) === undef &&
                // IE 8 serializes `undefined` as `"undefined"`. Safari <= 5.1.7 and
                // FF 3.1b3 pass this test.
                stringify(undef) === undef &&
                // Safari <= 5.1.7 and FF 3.1b3 throw `Error`s and `TypeError`s,
                // respectively, if the value is omitted entirely.
                stringify() === undef &&
                // FF 3.1b1, 2 throw an error if the given value is not a number,
                // string, array, object, Boolean, or `null` literal. This applies to
                // objects with custom `toJSON` methods as well, unless they are nested
                // inside object or array literals. YUI 3.0.0b1 ignores custom `toJSON`
                // methods entirely.
                stringify(value) === "1" &&
                stringify([value]) == "[1]" &&
                // Prototype <= 1.6.1 serializes `[undefined]` as `"[]"` instead of
                // `"[null]"`.
                stringify([undef]) == "[null]" &&
                // YUI 3.0.0b1 fails to serialize `null` literals.
                stringify(null) == "null" &&
                // FF 3.1b1, 2 halts serialization if an array contains a function:
                // `[1, true, getClass, 1]` serializes as "[1,true,],". FF 3.1b3
                // elides non-JSON values from objects and arrays, unless they
                // define custom `toJSON` methods.
                stringify([undef, getClass, null]) == "[null,null,null]" &&
                // Simple serialization test. FF 3.1b1 uses Unicode escape sequences
                // where character escape codes are expected (e.g., `\b` => `\u0008`).
                stringify({ "a": [value, true, false, null, "\x00\b\n\f\r\t"] }) == serialized &&
                // FF 3.1b1 and b2 ignore the `filter` and `width` arguments.
                stringify(null, value) === "1" &&
                stringify([1, 2], null, 1) == "[\n 1,\n 2\n]" &&
                // JSON 2, Prototype <= 1.7, and older WebKit builds incorrectly
                // serialize extended years.
                stringify(new Date(-8.64e15)) == '"-271821-04-20T00:00:00.000Z"' &&
                // The milliseconds are optional in ES 5, but required in 5.1.
                stringify(new Date(8.64e15)) == '"+275760-09-13T00:00:00.000Z"' &&
                // Firefox <= 11.0 incorrectly serializes years prior to 0 as negative
                // four-digit years instead of six-digit years. Credits: @Yaffle.
                stringify(new Date(-621987552e5)) == '"-000001-01-01T00:00:00.000Z"' &&
                // Safari <= 5.1.5 and Opera >= 10.53 incorrectly serialize millisecond
                // values less than 1000. Credits: @Yaffle.
                stringify(new Date(-1)) == '"1969-12-31T23:59:59.999Z"';
            } catch (exception) {
              stringifySupported = false;
            }
          }
          isSupported = stringifySupported;
        }
        // Test `JSON.parse`.
        if (name == "json-parse") {
          var parse = exports.parse;
          if (typeof parse == "function") {
            try {
              // FF 3.1b1, b2 will throw an exception if a bare literal is provided.
              // Conforming implementations should also coerce the initial argument to
              // a string prior to parsing.
              if (parse("0") === 0 && !parse(false)) {
                // Simple parsing test.
                value = parse(serialized);
                var parseSupported = value["a"].length == 5 && value["a"][0] === 1;
                if (parseSupported) {
                  try {
                    // Safari <= 5.1.2 and FF 3.1b1 allow unescaped tabs in strings.
                    parseSupported = !parse('"\t"');
                  } catch (exception) {}
                  if (parseSupported) {
                    try {
                      // FF 4.0 and 4.0.1 allow leading `+` signs and leading
                      // decimal points. FF 4.0, 4.0.1, and IE 9-10 also allow
                      // certain octal literals.
                      parseSupported = parse("01") !== 1;
                    } catch (exception) {}
                  }
                  if (parseSupported) {
                    try {
                      // FF 4.0, 4.0.1, and Rhino 1.7R3-R4 allow trailing decimal
                      // points. These environments, along with FF 3.1b1 and 2,
                      // also allow trailing commas in JSON objects and arrays.
                      parseSupported = parse("1.") !== 1;
                    } catch (exception) {}
                  }
                }
              }
            } catch (exception) {
              parseSupported = false;
            }
          }
          isSupported = parseSupported;
        }
      }
      return has[name] = !!isSupported;
    }

    if (true) { // used to be !has("json")
      // Common `[[Class]]` name aliases.
      var functionClass = "[object Function]",
          dateClass = "[object Date]",
          numberClass = "[object Number]",
          stringClass = "[object String]",
          arrayClass = "[object Array]",
          booleanClass = "[object Boolean]";

      // Detect incomplete support for accessing string characters by index.
      var charIndexBuggy = has("bug-string-char-index");

      // Define additional utility methods if the `Date` methods are buggy.
      if (!isExtended) {
        var floor = Math.floor;
        // A mapping between the months of the year and the number of days between
        // January 1st and the first of the respective month.
        var Months = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334];
        // Internal: Calculates the number of days between the Unix epoch and the
        // first day of the given month.
        var getDay = function (year, month) {
          return Months[month] + 365 * (year - 1970) + floor((year - 1969 + (month = +(month > 1))) / 4) - floor((year - 1901 + month) / 100) + floor((year - 1601 + month) / 400);
        };
      }

      // Internal: Determines if a property is a direct property of the given
      // object. Delegates to the native `Object#hasOwnProperty` method.
      if (!(isProperty = objectProto.hasOwnProperty)) {
        isProperty = function (property) {
          var members = {}, constructor;
          if ((members.__proto__ = null, members.__proto__ = {
            // The *proto* property cannot be set multiple times in recent
            // versions of Firefox and SeaMonkey.
            "toString": 1
          }, members).toString != getClass) {
            // Safari <= 2.0.3 doesn't implement `Object#hasOwnProperty`, but
            // supports the mutable *proto* property.
            isProperty = function (property) {
              // Capture and break the object's prototype chain (see section 8.6.2
              // of the ES 5.1 spec). The parenthesized expression prevents an
              // unsafe transformation by the Closure Compiler.
              var original = this.__proto__, result = property in (this.__proto__ = null, this);
              // Restore the original prototype chain.
              this.__proto__ = original;
              return result;
            };
          } else {
            // Capture a reference to the top-level `Object` constructor.
            constructor = members.constructor;
            // Use the `constructor` property to simulate `Object#hasOwnProperty` in
            // other environments.
            isProperty = function (property) {
              var parent = (this.constructor || constructor).prototype;
              return property in this && !(property in parent && this[property] === parent[property]);
            };
          }
          members = null;
          return isProperty.call(this, property);
        };
      }

      // Internal: Normalizes the `for...in` iteration algorithm across
      // environments. Each enumerated key is yielded to a `callback` function.
      forEach = function (object, callback) {
        var size = 0, Properties, members, property;

        // Tests for bugs in the current environment's `for...in` algorithm. The
        // `valueOf` property inherits the non-enumerable flag from
        // `Object.prototype` in older versions of IE, Netscape, and Mozilla.
        (Properties = function () {
          this.valueOf = 0;
        }).prototype.valueOf = 0;

        // Iterate over a new instance of the `Properties` class.
        members = new Properties();
        for (property in members) {
          // Ignore all properties inherited from `Object.prototype`.
          if (isProperty.call(members, property)) {
            size++;
          }
        }
        Properties = members = null;

        // Normalize the iteration algorithm.
        if (!size) {
          // A list of non-enumerable properties inherited from `Object.prototype`.
          members = ["valueOf", "toString", "toLocaleString", "propertyIsEnumerable", "isPrototypeOf", "hasOwnProperty", "constructor"];
          // IE <= 8, Mozilla 1.0, and Netscape 6.2 ignore shadowed non-enumerable
          // properties.
          forEach = function (object, callback) {
            var isFunction = getClass.call(object) == functionClass, property, length;
            var hasProperty = !isFunction && typeof object.constructor != "function" && objectTypes[typeof object.hasOwnProperty] && object.hasOwnProperty || isProperty;
            for (property in object) {
              // Gecko <= 1.0 enumerates the `prototype` property of functions under
              // certain conditions; IE does not.
              if (!(isFunction && property == "prototype") && hasProperty.call(object, property)) {
                callback(property);
              }
            }
            // Manually invoke the callback for each non-enumerable property.
            for (length = members.length; property = members[--length]; hasProperty.call(object, property) && callback(property));
          };
        } else if (size == 2) {
          // Safari <= 2.0.4 enumerates shadowed properties twice.
          forEach = function (object, callback) {
            // Create a set of iterated properties.
            var members = {}, isFunction = getClass.call(object) == functionClass, property;
            for (property in object) {
              // Store each property name to prevent double enumeration. The
              // `prototype` property of functions is not enumerated due to cross-
              // environment inconsistencies.
              if (!(isFunction && property == "prototype") && !isProperty.call(members, property) && (members[property] = 1) && isProperty.call(object, property)) {
                callback(property);
              }
            }
          };
        } else {
          // No bugs detected; use the standard `for...in` algorithm.
          forEach = function (object, callback) {
            var isFunction = getClass.call(object) == functionClass, property, isConstructor;
            for (property in object) {
              if (!(isFunction && property == "prototype") && isProperty.call(object, property) && !(isConstructor = property === "constructor")) {
                callback(property);
              }
            }
            // Manually invoke the callback for the `constructor` property due to
            // cross-environment inconsistencies.
            if (isConstructor || isProperty.call(object, (property = "constructor"))) {
              callback(property);
            }
          };
        }
        return forEach(object, callback);
      };

      // Public: Serializes a JavaScript `value` as a JSON string. The optional
      // `filter` argument may specify either a function that alters how object and
      // array members are serialized, or an array of strings and numbers that
      // indicates which properties should be serialized. The optional `width`
      // argument may be either a string or number that specifies the indentation
      // level of the output.
      if (true) {
        // Internal: A map of control characters and their escaped equivalents.
        var Escapes = {
          92: "\\\\",
          34: '\\"',
          8: "\\b",
          12: "\\f",
          10: "\\n",
          13: "\\r",
          9: "\\t"
        };

        // Internal: Converts `value` into a zero-padded string such that its
        // length is at least equal to `width`. The `width` must be <= 6.
        var leadingZeroes = "000000";
        var toPaddedString = function (width, value) {
          // The `|| 0` expression is necessary to work around a bug in
          // Opera <= 7.54u2 where `0 == -0`, but `String(-0) !== "0"`.
          return (leadingZeroes + (value || 0)).slice(-width);
        };

        // Internal: Double-quotes a string `value`, replacing all ASCII control
        // characters (characters with code unit values between 0 and 31) with
        // their escaped equivalents. This is an implementation of the
        // `Quote(value)` operation defined in ES 5.1 section 15.12.3.
        var unicodePrefix = "\\u00";
        var quote = function (value) {
          var result = '"', index = 0, length = value.length, useCharIndex = !charIndexBuggy || length > 10;
          var symbols = useCharIndex && (charIndexBuggy ? value.split("") : value);
          for (; index < length; index++) {
            var charCode = value.charCodeAt(index);
            // If the character is a control character, append its Unicode or
            // shorthand escape sequence; otherwise, append the character as-is.
            switch (charCode) {
              case 8: case 9: case 10: case 12: case 13: case 34: case 92:
                result += Escapes[charCode];
                break;
              default:
                if (charCode < 32) {
                  result += unicodePrefix + toPaddedString(2, charCode.toString(16));
                  break;
                }
                result += useCharIndex ? symbols[index] : value.charAt(index);
            }
          }
          return result + '"';
        };

        // Internal: Recursively serializes an object. Implements the
        // `Str(key, holder)`, `JO(value)`, and `JA(value)` operations.
        var serialize = function (property, object, callback, properties, whitespace, indentation, stack, maxLineLength) {
          var value, className, year, month, date, time, hours, minutes, seconds, milliseconds, results, element, index, length, prefix, result;

          maxLineLength = maxLineLength || 0;

          try {
            // Necessary for host object support.
            value = object[property];
          } catch (exception) {}
          if (typeof value == "object" && value) {
            className = getClass.call(value);
            if (className == dateClass && !isProperty.call(value, "toJSON")) {
              if (value > -1 / 0 && value < 1 / 0) {
                // Dates are serialized according to the `Date#toJSON` method
                // specified in ES 5.1 section 15.9.5.44. See section 15.9.1.15
                // for the ISO 8601 date time string format.
                if (getDay) {
                  // Manually compute the year, month, date, hours, minutes,
                  // seconds, and milliseconds if the `getUTC*` methods are
                  // buggy. Adapted from @Yaffle's `date-shim` project.
                  date = floor(value / 864e5);
                  for (year = floor(date / 365.2425) + 1970 - 1; getDay(year + 1, 0) <= date; year++);
                  for (month = floor((date - getDay(year, 0)) / 30.42); getDay(year, month + 1) <= date; month++);
                  date = 1 + date - getDay(year, month);
                  // The `time` value specifies the time within the day (see ES
                  // 5.1 section 15.9.1.2). The formula `(A % B + B) % B` is used
                  // to compute `A modulo B`, as the `%` operator does not
                  // correspond to the `modulo` operation for negative numbers.
                  time = (value % 864e5 + 864e5) % 864e5;
                  // The hours, minutes, seconds, and milliseconds are obtained by
                  // decomposing the time within the day. See section 15.9.1.10.
                  hours = floor(time / 36e5) % 24;
                  minutes = floor(time / 6e4) % 60;
                  seconds = floor(time / 1e3) % 60;
                  milliseconds = time % 1e3;
                } else {
                  year = value.getUTCFullYear();
                  month = value.getUTCMonth();
                  date = value.getUTCDate();
                  hours = value.getUTCHours();
                  minutes = value.getUTCMinutes();
                  seconds = value.getUTCSeconds();
                  milliseconds = value.getUTCMilliseconds();
                }
                // Serialize extended years correctly.
                value = (year <= 0 || year >= 1e4 ? (year < 0 ? "-" : "+") + toPaddedString(6, year < 0 ? -year : year) : toPaddedString(4, year)) +
                  "-" + toPaddedString(2, month + 1) + "-" + toPaddedString(2, date) +
                  // Months, dates, hours, minutes, and seconds should have two
                  // digits; milliseconds should have three.
                  "T" + toPaddedString(2, hours) + ":" + toPaddedString(2, minutes) + ":" + toPaddedString(2, seconds) +
                  // Milliseconds are optional in ES 5.0, but required in 5.1.
                  "." + toPaddedString(3, milliseconds) + "Z";
              } else {
                value = null;
              }
            } else if (typeof value.toJSON == "function" && ((className != numberClass && className != stringClass && className != arrayClass) || isProperty.call(value, "toJSON"))) {
              // Prototype <= 1.6.1 adds non-standard `toJSON` methods to the
              // `Number`, `String`, `Date`, and `Array` prototypes. JSON 3
              // ignores all `toJSON` methods on these objects unless they are
              // defined directly on an instance.
              value = value.toJSON(property);
            }
          }
          if (callback) {
            // If a replacement function was provided, call it to obtain the value
            // for serialization.
            value = callback.call(object, property, value);
          }
          if (value === null) {
            return "null";
          }
          className = getClass.call(value);
          if (className == booleanClass) {
            // Booleans are represented literally.
            return "" + value;
          } else if (className == numberClass) {
            // JSON numbers must be finite. `Infinity` and `NaN` are serialized as
            // `"null"`.
            return value > -1 / 0 && value < 1 / 0 ? "" + value : "null";
          } else if (className == stringClass) {
            // Strings are double-quoted and escaped.
            return quote("" + value);
          }
          // Recursively serialize objects and arrays.
          if (typeof value == "object") {
            // Check for cyclic structures. This is a linear search; performance
            // is inversely proportional to the number of unique nested objects.
            for (length = stack.length; length--;) {
              if (stack[length] === value) {
                // Cyclic structures cannot be serialized by `JSON.stringify`.
                throw TypeError();
              }
            }
            // Add the object to the stack of traversed objects.
            stack.push(value);
            results = [];
            // Save the current indentation level and indent one additional level.
            prefix = indentation;
            indentation += whitespace;
            if (className == arrayClass) {
              var totalLength = indentation.length, result;
              // Recursively serialize array elements.
              for (index = 0, length = value.length; index < length; index++) {
                element = serialize(index, value, callback, properties, whitespace, indentation,
                  stack, maxLineLength);
                result = element === undef ? "null" : element;
                totalLength += result.length + (index > 0 ? 1 : 0);
                results.push(result);
              }
              result = results.length ?
                (
                  whitespace && (totalLength > maxLineLength) ?
                  "[\n" + indentation + results.join(",\n" + indentation) + "\n" + prefix + "]" :
                  "[" + results.join(",") + "]"
                )
                : "[]";
            } else {
              var totalLength = indentation.length, index=0;
              // Recursively serialize object members. Members are selected from
              // either a user-specified list of property names, or the object
              // itself.
              forEach(properties || value, function (property) {
                var result, element = serialize(property, value, callback, properties, whitespace, indentation,
                                        stack, maxLineLength);

                if (element !== undef) {
                  // According to ES 5.1 section 15.12.3: "If `gap` {whitespace}
                  // is not the empty string, let `member` {quote(property) + ":"}
                  // be the concatenation of `member` and the `space` character."
                  // The "`space` character" refers to the literal space
                  // character, not the `space` {width} argument provided to
                  // `JSON.stringify`.
                  result = quote(property) + ":" + (whitespace ? " " : "") + element;
                  totalLength += result.length + (index++ > 0 ? 1 : 0);
                  results.push(result);
                }
              });
              result = results.length ?
                (
                  whitespace && (totalLength > maxLineLength) ?
                  "{\n" + indentation + results.join(",\n" + indentation) + "\n" + prefix + "}" :
                  "{" + results.join(",") + "}"
                )
                : "{}";
            }
            // Remove the object from the traversed object stack.
            stack.pop();
            return result;
          }
        };

        // Public: `JSON.stringify`. See ES 5.1 section 15.12.3.

        exports.stringify = function (source, filter, width, maxLineLength) {
          var whitespace, callback, properties, className;
          if (objectTypes[typeof filter] && filter) {
            if ((className = getClass.call(filter)) == functionClass) {
              callback = filter;
            } else if (className == arrayClass) {
              // Convert the property names array into a makeshift set.
              properties = {};
              for (var index = 0, length = filter.length, value; index < length; value = filter[index++], ((className = getClass.call(value)), className == stringClass || className == numberClass) && (properties[value] = 1));
            }
          }
          if (width) {
            if ((className = getClass.call(width)) == numberClass) {
              // Convert the `width` to an integer and create a string containing
              // `width` number of space characters.
              if ((width -= width % 1) > 0) {
                for (whitespace = "", width > 10 && (width = 10); whitespace.length < width; whitespace += " ");
              }
            } else if (className == stringClass) {
              whitespace = width.length <= 10 ? width : width.slice(0, 10);
            }
          }
          // Opera <= 7.54u2 discards the values associated with empty string keys
          // (`""`) only if they are used directly within an object member list
          // (e.g., `!("" in { "": 1})`).
          return serialize("", (value = {}, value[""] = source, value), callback, properties, whitespace, "", [], maxLineLength);
        };

        exports.compactStringify = function (source, filter, width){
          return exports.stringify(source, filter, width, 60);
        }
      }

      // Public: Parses a JSON source string.
      if (!has("json-parse")) {
        var fromCharCode = String.fromCharCode;

        // Internal: A map of escaped control characters and their unescaped
        // equivalents.
        var Unescapes = {
          92: "\\",
          34: '"',
          47: "/",
          98: "\b",
          116: "\t",
          110: "\n",
          102: "\f",
          114: "\r"
        };

        // Internal: Stores the parser state.
        var Index, Source;

        // Internal: Resets the parser state and throws a `SyntaxError`.
        var abort = function () {
          Index = Source = null;
          throw SyntaxError();
        };

        // Internal: Returns the next token, or `"$"` if the parser has reached
        // the end of the source string. A token may be a string, number, `null`
        // literal, or Boolean literal.
        var lex = function () {
          var source = Source, length = source.length, value, begin, position, isSigned, charCode;
          while (Index < length) {
            charCode = source.charCodeAt(Index);
            switch (charCode) {
              case 9: case 10: case 13: case 32:
                // Skip whitespace tokens, including tabs, carriage returns, line
                // feeds, and space characters.
                Index++;
                break;
              case 123: case 125: case 91: case 93: case 58: case 44:
                // Parse a punctuator token (`{`, `}`, `[`, `]`, `:`, or `,`) at
                // the current position.
                value = charIndexBuggy ? source.charAt(Index) : source[Index];
                Index++;
                return value;
              case 34:
                // `"` delimits a JSON string; advance to the next character and
                // begin parsing the string. String tokens are prefixed with the
                // sentinel `@` character to distinguish them from punctuators and
                // end-of-string tokens.
                for (value = "@", Index++; Index < length;) {
                  charCode = source.charCodeAt(Index);
                  if (charCode < 32) {
                    // Unescaped ASCII control characters (those with a code unit
                    // less than the space character) are not permitted.
                    abort();
                  } else if (charCode == 92) {
                    // A reverse solidus (`\`) marks the beginning of an escaped
                    // control character (including `"`, `\`, and `/`) or Unicode
                    // escape sequence.
                    charCode = source.charCodeAt(++Index);
                    switch (charCode) {
                      case 92: case 34: case 47: case 98: case 116: case 110: case 102: case 114:
                        // Revive escaped control characters.
                        value += Unescapes[charCode];
                        Index++;
                        break;
                      case 117:
                        // `\u` marks the beginning of a Unicode escape sequence.
                        // Advance to the first character and validate the
                        // four-digit code point.
                        begin = ++Index;
                        for (position = Index + 4; Index < position; Index++) {
                          charCode = source.charCodeAt(Index);
                          // A valid sequence comprises four hexdigits (case-
                          // insensitive) that form a single hexadecimal value.
                          if (!(charCode >= 48 && charCode <= 57 || charCode >= 97 && charCode <= 102 || charCode >= 65 && charCode <= 70)) {
                            // Invalid Unicode escape sequence.
                            abort();
                          }
                        }
                        // Revive the escaped character.
                        value += fromCharCode("0x" + source.slice(begin, Index));
                        break;
                      default:
                        // Invalid escape sequence.
                        abort();
                    }
                  } else {
                    if (charCode == 34) {
                      // An unescaped double-quote character marks the end of the
                      // string.
                      break;
                    }
                    charCode = source.charCodeAt(Index);
                    begin = Index;
                    // Optimize for the common case where a string is valid.
                    while (charCode >= 32 && charCode != 92 && charCode != 34) {
                      charCode = source.charCodeAt(++Index);
                    }
                    // Append the string as-is.
                    value += source.slice(begin, Index);
                  }
                }
                if (source.charCodeAt(Index) == 34) {
                  // Advance to the next character and return the revived string.
                  Index++;
                  return value;
                }
                // Unterminated string.
                abort();
              default:
                // Parse numbers and literals.
                begin = Index;
                // Advance past the negative sign, if one is specified.
                if (charCode == 45) {
                  isSigned = true;
                  charCode = source.charCodeAt(++Index);
                }
                // Parse an integer or floating-point value.
                if (charCode >= 48 && charCode <= 57) {
                  // Leading zeroes are interpreted as octal literals.
                  if (charCode == 48 && ((charCode = source.charCodeAt(Index + 1)), charCode >= 48 && charCode <= 57)) {
                    // Illegal octal literal.
                    abort();
                  }
                  isSigned = false;
                  // Parse the integer component.
                  for (; Index < length && ((charCode = source.charCodeAt(Index)), charCode >= 48 && charCode <= 57); Index++);
                  // Floats cannot contain a leading decimal point; however, this
                  // case is already accounted for by the parser.
                  if (source.charCodeAt(Index) == 46) {
                    position = ++Index;
                    // Parse the decimal component.
                    for (; position < length && ((charCode = source.charCodeAt(position)), charCode >= 48 && charCode <= 57); position++);
                    if (position == Index) {
                      // Illegal trailing decimal.
                      abort();
                    }
                    Index = position;
                  }
                  // Parse exponents. The `e` denoting the exponent is
                  // case-insensitive.
                  charCode = source.charCodeAt(Index);
                  if (charCode == 101 || charCode == 69) {
                    charCode = source.charCodeAt(++Index);
                    // Skip past the sign following the exponent, if one is
                    // specified.
                    if (charCode == 43 || charCode == 45) {
                      Index++;
                    }
                    // Parse the exponential component.
                    for (position = Index; position < length && ((charCode = source.charCodeAt(position)), charCode >= 48 && charCode <= 57); position++);
                    if (position == Index) {
                      // Illegal empty exponent.
                      abort();
                    }
                    Index = position;
                  }
                  // Coerce the parsed value to a JavaScript number.
                  return +source.slice(begin, Index);
                }
                // A negative sign may only precede numbers.
                if (isSigned) {
                  abort();
                }
                // `true`, `false`, and `null` literals.
                if (source.slice(Index, Index + 4) == "true") {
                  Index += 4;
                  return true;
                } else if (source.slice(Index, Index + 5) == "false") {
                  Index += 5;
                  return false;
                } else if (source.slice(Index, Index + 4) == "null") {
                  Index += 4;
                  return null;
                }
                // Unrecognized token.
                abort();
            }
          }
          // Return the sentinel `$` character if the parser has reached the end
          // of the source string.
          return "$";
        };

        // Internal: Parses a JSON `value` token.
        var get = function (value) {
          var results, hasMembers;
          if (value == "$") {
            // Unexpected end of input.
            abort();
          }
          if (typeof value == "string") {
            if ((charIndexBuggy ? value.charAt(0) : value[0]) == "@") {
              // Remove the sentinel `@` character.
              return value.slice(1);
            }
            // Parse object and array literals.
            if (value == "[") {
              // Parses a JSON array, returning a new JavaScript array.
              results = [];
              for (;; hasMembers || (hasMembers = true)) {
                value = lex();
                // A closing square bracket marks the end of the array literal.
                if (value == "]") {
                  break;
                }
                // If the array literal contains elements, the current token
                // should be a comma separating the previous element from the
                // next.
                if (hasMembers) {
                  if (value == ",") {
                    value = lex();
                    if (value == "]") {
                      // Unexpected trailing `,` in array literal.
                      abort();
                    }
                  } else {
                    // A `,` must separate each array element.
                    abort();
                  }
                }
                // Elisions and leading commas are not permitted.
                if (value == ",") {
                  abort();
                }
                results.push(get(value));
              }
              return results;
            } else if (value == "{") {
              // Parses a JSON object, returning a new JavaScript object.
              results = {};
              for (;; hasMembers || (hasMembers = true)) {
                value = lex();
                // A closing curly brace marks the end of the object literal.
                if (value == "}") {
                  break;
                }
                // If the object literal contains members, the current token
                // should be a comma separator.
                if (hasMembers) {
                  if (value == ",") {
                    value = lex();
                    if (value == "}") {
                      // Unexpected trailing `,` in object literal.
                      abort();
                    }
                  } else {
                    // A `,` must separate each object member.
                    abort();
                  }
                }
                // Leading commas are not permitted, object property names must be
                // double-quoted strings, and a `:` must separate each property
                // name and value.
                if (value == "," || typeof value != "string" || (charIndexBuggy ? value.charAt(0) : value[0]) != "@" || lex() != ":") {
                  abort();
                }
                results[value.slice(1)] = get(lex());
              }
              return results;
            }
            // Unexpected token encountered.
            abort();
          }
          return value;
        };

        // Internal: Updates a traversed object member.
        var update = function (source, property, callback) {
          var element = walk(source, property, callback);
          if (element === undef) {
            delete source[property];
          } else {
            source[property] = element;
          }
        };

        // Internal: Recursively traverses a parsed JSON object, invoking the
        // `callback` function for each value. This is an implementation of the
        // `Walk(holder, name)` operation defined in ES 5.1 section 15.12.2.
        var walk = function (source, property, callback) {
          var value = source[property], length;
          if (typeof value == "object" && value) {
            // `forEach` can't be used to traverse an array in Opera <= 8.54
            // because its `Object#hasOwnProperty` implementation returns `false`
            // for array indices (e.g., `![1, 2, 3].hasOwnProperty("0")`).
            if (getClass.call(value) == arrayClass) {
              for (length = value.length; length--;) {
                update(value, length, callback);
              }
            } else {
              forEach(value, function (property) {
                update(value, property, callback);
              });
            }
          }
          return callback.call(source, property, value);
        };

        // Public: `JSON.parse`. See ES 5.1 section 15.12.2.
        exports.parse = function (source, callback) {
          var result, value;
          Index = 0;
          Source = "" + source;
          result = get(lex());
          // If a JSON string contains multiple tokens, it is invalid.
          if (lex() != "$") {
            abort();
          }
          // Reset the parser state.
          Index = Source = null;
          return callback && getClass.call(callback) == functionClass ? walk((value = {}, value[""] = result, value), "", callback) : result;
        };
      }
    }

    exports["runInContext"] = runInContext;
    return exports;
  }

  if (freeExports && !isLoader) {
    // Export for CommonJS environments.
    runInContext(root, freeExports);
  } else {
    // Export for web browsers and JavaScript engines.
    var nativeJSON = root.JSON,
        previousJSON = root["JSON3"],
        isRestored = false;

    var JSON3 = runInContext(root, (root["JSON3"] = {
      // Public: Restores the original value of the global `JSON` object and
      // returns a reference to the `JSON3` object.
      "noConflict": function () {
        if (!isRestored) {
          isRestored = true;
          root.JSON = nativeJSON;
          root["JSON3"] = previousJSON;
          nativeJSON = previousJSON = null;
        }
        return JSON3;
      }
    }));

    root.JSON = {
      "parse": JSON3.parse,
      "stringify": JSON3.stringify
    };
  }

  // Export for asynchronous module loaders.
  if (isLoader) {
    define(function () {
      return JSON3;
    });
  }
}).call(this);
}());

;(function() {
'use strict';
/* globals window, angular */

angular.module('vlui', [
  'LocalStorageModule',
  'angular-google-analytics'
  ])
  .constant('_', window._)
  // datalib, vegalite, vega
  .constant('dl', window.dl)
  .constant('vl', window.vl)
  .constant('vg', window.vg)
  // other libraries
  .constant('Blob', window.Blob)
  .constant('URL', window.URL)
  .constant('Drop', window.Drop)
  .constant('Heap', window.Heap)
  // Use the customized vendor/json3-compactstringify
  .constant('JSON3', window.JSON3.noConflict())
  // constants
  .constant('consts', {
    addCount: true, // add count field to Dataset.dataschema
    debug: true,
    useUrl: true,
    logging: true,
    defaultConfigSet: 'large',
    appId: 'vlui',
    // embedded polestar and voyager with known data
    embeddedData: window.vguiData || undefined,
    priority: {
      bookmark: 0,
      popup: 0,
      vislist: 1000
    },
    myriaRest: 'http://ec2-52-1-38-182.compute-1.amazonaws.com:8753',
    typeNames: {
      N: 'text',
      O: 'text-ordinal',
      Q: 'number',
      T: 'time',
      G: 'geo'
    }
  })
  .config(['AnalyticsProvider', function (AnalyticsProvider) {
    AnalyticsProvider
      .setAccount({ tracker: 'UA-44428446-4', name: 'voyager', trackEvent: true });
  }]);
}());

;(function() {
angular.module("vlui").run(["$templateCache", function($templateCache) {$templateCache.put("alertmessages/alertmessages.html","<div class=\"alert-box\" ng-show=\"Alerts.alerts.length > 0\"><div class=\"alert-item\" ng-repeat=\"alert in Alerts.alerts\">{{ alert.msg }} <a class=\"close\" ng-click=\"Alerts.closeAlert($index)\">&times;</a></div></div>");
$templateCache.put("bookmarklist/bookmarklist.html","<modal id=\"bookmark-list\" ng-if=\"Bookmarks.isSupported\"><div class=\"modal-header card no-top-margin no-right-margin\"><modal-close-button on-close=\"logBookmarksClosed()\"></modal-close-button><h2 class=\"no-bottom-margin\">Bookmarks ({{ Bookmarks.length }})</h2><a ng-click=\"Bookmarks.clear()\"><i class=\"fa fa-trash-o\"></i> Clear all</a></div><div class=\"flex-grow-1 scroll-y\"><div ng-if=\"Bookmarks.length > 0\" class=\"hflex flex-wrap\"><vl-plot-group ng-repeat=\"chart in Bookmarks.dict | orderObjectBy : \'timeAdded\' : false\" class=\"wrapped-vl-plot-group card\" chart=\"chart\" field-set=\"chart.fieldSet\" show-bookmark=\"true\" show-debug=\"consts.debug\" show-expand=\"false\" always-selected=\"true\" highlighted=\"highlighted\" ng-mouseover=\"(highlighted||{})[field.name] = true\" ng-mouseout=\"(highlighted||{})[field.name] = false\" overflow=\"true\" tooltip=\"true\" priority=\"consts.priority.bookmark\"></vl-plot-group></div><div class=\"vis-list-empty\" ng-if=\"Bookmarks.length === 0\">You have no bookmarks</div></div></modal>");
$templateCache.put("dataset/addmyriadataset.html","<div class=\"add-myria-dataset\"><p>Select a dataset from the Myria instance at <code>{{myriaRestUrl}}</code>.</p><form ng-submit=\"addDataset(myriaDataset)\"><div><select name=\"myria-dataset\" id=\"select-myria-dataset\" ng-disabled=\"disabled\" ng-model=\"myriaDataset\" ng-options=\"optionName(dataset) for dataset in myriaDatasets track by dataset.relationName\"><option value=\"\">Select Dataset...</option></select></div><button type=\"submit\">Add dataset</button></form></div>");
$templateCache.put("dataset/addurldataset.html","<div class=\"add-url-dataset\"><p>Add the name of the dataset and the URL to a <b>JSON</b> or <b>CSV</b> (with header) file. Make sure that the formatting is correct and clean the data before adding it to Voyager. The added dataset is only visible to you.</p><form ng-submit=\"addFromUrl(addedDataset)\"><div class=\"form-group\"><label for=\"dataset-name\">Name</label> <input ng-model=\"addedDataset.name\" id=\"dataset-name\" type=\"text\"></div><div class=\"form-group\"><label for=\"dataset-url\">URL</label> <input ng-model=\"addedDataset.url\" id=\"dataset-url\" type=\"url\"><p>Make sure that you host the file on a server that has <code>Access-Control-Allow-Origin: *</code> set.</p></div><button type=\"submit\">Add dataset</button></form></div>");
$templateCache.put("dataset/changeloadeddataset.html","<div class=\"change-loaded-dataset\"><div ng-if=\"userData.length\"><h3>Uploaded Datasets</h3><ul><li ng-repeat=\"dataset in userData track by dataset.id\" ng-class=\"{selected: Dataset.currentDataset.id === dataset.id}\"><a class=\"dataset\" ng-click=\"selectDataset(dataset)\" ng-disabled=\"Dataset.currentDataset.id === dataset.id\"><i class=\"fa fa-database\"></i> <strong>{{dataset.name}}</strong></a> <span ng-if=\"dataset.description\">{{dataset.description}}</span> <strong ng-if=\"Dataset.currentDataset === dataset\">(selected)</strong></li></ul></div><h3>Explore a Sample Dataset</h3><ul class=\"loaded-dataset-list\"><li ng-repeat=\"dataset in sampleData track by dataset.id\" ng-class=\"{selected: Dataset.currentDataset.id === dataset.id}\"><a class=\"dataset\" ng-click=\"selectDataset(dataset)\" ng-disabled=\"Dataset.currentDataset.id === dataset.id\"><i class=\"fa fa-database\"></i> <strong>{{dataset.name}}</strong></a> <strong ng-if=\"Dataset.currentDataset === dataset\">(selected)</strong> <em ng-if=\"dataset.description\">{{dataset.description}}</em></li></ul></div>");
$templateCache.put("dataset/datasetmodal.html","<modal id=\"dataset-modal\" max-width=\"800px\"><div class=\"modal-header\"><modal-close-button></modal-close-button><h2>Add Dataset</h2></div><tabset><tab heading=\"Change Dataset\"><change-loaded-dataset></change-loaded-dataset></tab><tab heading=\"Paste or Upload Data\"><paste-dataset></paste-dataset></tab><tab heading=\"From URL\"><add-url-dataset></add-url-dataset></tab><tab heading=\"From Myria\"><add-myria-dataset></add-myria-dataset></tab></tabset></modal>");
$templateCache.put("dataset/datasetselector.html","<button id=\"select-data\" class=\"small-button select-data\" ng-click=\"loadDataset();\">Change</button>");
$templateCache.put("dataset/filedropzone.html","<div class=\"dropzone\" ng-transclude=\"\"></div>");
$templateCache.put("dataset/pastedataset.html","<div class=\"paste-data\"><file-dropzone dataset=\"dataset\" max-file-size=\"10\" valid-mime-types=\"[text/csv, text/json, text/tsv]\"><div class=\"upload-data\"><div class=\"form-group\"><label for=\"dataset-file\">File</label> <input type=\"file\" id=\"dataset-file\" accept=\"text/csv,text/tsv\"></div><p>Upload a CSV, or paste data in <a href=\"https://en.wikipedia.org/wiki/Comma-separated_values\">CSV</a> format into the fields.</p><div class=\"dropzone-target\"><p>Drop CSV file here</p></div></div><form ng-submit=\"addDataset()\"><div class=\"form-group\"><label for=\"dataset-name\">Name</label> <input type=\"name\" ng-model=\"dataset.name\" id=\"dataset-name\" required=\"\"></div><div class=\"form-group\"><textarea ng-model=\"dataset.data\" ng-model-options=\"{ updateOn: \'default blur\', debounce: { \'default\': 17, \'blur\': 0 }}\" required=\"\">\n      </textarea></div><button type=\"submit\">Add data</button></form></file-dropzone></div>");
$templateCache.put("fieldinfo/fieldinfo.html","<span class=\"field-info\"><span class=\"hflex full-width\" ng-click=\"clicked($event)\"><span class=\"type-caret\" ng-class=\"{active: !disableCountCaret || field.aggregate!==\'count\'}\"><i class=\"fa fa-caret-down\" ng-show=\"showCaret\"></i> <span class=\"type fa {{icon}}\" ng-show=\"showType\" title=\"{{typeNames[field.type]}}\"></span></span> <span ng-if=\"field.aggregate!==\'count\'\" class=\"field-info-text\"><span ng-if=\"func(field)\" class=\"field-func\" ng-class=\"{any: field._any}\">{{ func(field) }}</span><span class=\"field-name\" ng-class=\"{hasfunc: func(field), any: field._any}\">{{ field.name | underscore2space }}</span></span> <span ng-if=\"field.aggregate===\'count\'\" class=\"field-count field-info-text\"><span class=\"field-name\">COUNT</span></span> <span class=\"no-shrink remove\" ng-show=\"showRemove\"><a class=\"remove-field\" ng-click=\"removeAction()\"><i class=\"fa fa-times\"></i></a></span> <span class=\"no-shrink info\" ng-show=\"showInfo\"><i ng-if=\"field.aggregate !== \'count\' && isTypes(field, [\'N\', \'O\'])\" class=\"fa fa-info-circle\" tooltips=\"\" tooltip-size=\"small\" tooltip-html=\"<div class=\'tooltip-content\'> <strong>Name:</strong> {{field.name}}<br> <strong>Cardinality:</strong> {{stats.distinct | number}}<br> <strong>Min:</strong> {{stats.min}}<br> <strong>Max:</strong> {{stats.max}}<br> <strong>Sample:</strong> <span class=\'sample\'>{{stats.sample.join(\', \')}}</span> </div>\" tooltip-side=\"right\"></i> <i ng-if=\"field.aggregate !== \'count\' && field.type === \'T\'\" class=\"fa fa-info-circle\" tooltips=\"\" tooltip-size=\"small\" tooltip-html=\"<div class=\'tooltip-content\'> <strong>Name:</strong> {{field.name}}<br> <strong>Cardinality:</strong> {{stats.distinct | number}}<br> <strong>Min:</strong> {{stats.min | date: short}}<br> <strong>Max:</strong> {{stats.max | date: short}}<br> <strong>Sample:</strong> <span class=\'sample\'>{{stats.sample.join(\', \')}}</span> </div>\" tooltip-side=\"right\"></i> <i ng-if=\"field.aggregate !== \'count\' && field.type === \'Q\'\" class=\"fa fa-info-circle\" tooltips=\"\" tooltip-size=\"small\" tooltip-html=\"<div class=\'tooltip-content\'> <strong>Name:</strong> {{field.name}}<br> <strong>Cardinality:</strong> {{stats.distinct | number}}<br> <strong>Min:</strong> {{stats.min | number}}<br> <strong>Max:</strong> {{stats.max | number}}<br> <strong>Stdev:</strong> {{stats.stdev | number:2}}<br> <strong>Mean:</strong> {{stats.mean | number:2}}<br> <strong>Median:</strong> {{stats.median | number}}<br> <strong>Sample:</strong> <span class=\'sample\'>{{stats.sample.join(\', \')}}</span> </div>\" tooltip-side=\"right\"></i><i ng-if=\"field.aggregate === \'count\'\" class=\"fa fa-info-circle\" tooltips=\"\" tooltip-size=\"small\" tooltip-html=\"<div class=\'tooltip-content\'> <strong>Count:</strong> {{stats.max}} </div>\" tooltip-side=\"right\"></i></span></span></span>");
$templateCache.put("modal/modal.html","<div class=\"modal\" ng-if=\"isOpen\"><div class=\"modal-wrapper\" style=\"{{wrapperStyle}}\" ng-transclude=\"\"></div></div>");
$templateCache.put("modal/modalclosebutton.html","<div class=\"right\"><a ng-click=\"closeModal()\" class=\"right\">Close</a></div>");
$templateCache.put("tabs/tab.html","<div ng-if=\"active\" ng-transclude=\"\"></div>");
$templateCache.put("tabs/tabset.html","<div class=\"tab-container\"><div><a class=\"tab\" ng-repeat=\"tab in tabset.tabs\" ng-class=\"{\'active\': tab.active}\" ng-click=\"tabset.showTab(tab)\">{{tab.heading}}</a></div><div class=\"tab-contents\" ng-transclude=\"\"></div></div>");
$templateCache.put("vlplot/vlplot.html","<div class=\"vis\" id=\"vis-{{visId}}\" ng-class=\"{ fit: !alwaysScrollable && !overflow && (maxHeight && (!height || height <= maxHeight)) && (maxWidth && (!width || width <= maxWidth)), overflow: alwaysScrollable || overflow || (maxHeight && height && height > maxHeight) || (maxWidth && width && width > maxWidth), scroll: alwaysScrollable || unlocked || hoverFocus }\" ng-mousedown=\"unlocked=!thumbnail\" ng-mouseup=\"unlocked=false\" ng-mouseover=\"mouseover()\" ng-mouseout=\"mouseout()\"><div class=\"vis-tooltip\" ng-show=\"tooltipActive\"><table><tr ng-repeat=\"p in data\"><td class=\"key\">{{p[0]}}</td><td class=\"value\"><b>{{p[1]}}</b></td></tr></table></div></div>");
$templateCache.put("vlplotgroup/vlplotgroup.html","<div class=\"vl-plot-group vflex\"><div ng-show=\"showExpand || fieldSet || showTranspose || showBookmark && Bookmarks.isSupported || showToggle\" class=\"vl-plot-group-header full-width no-shrink\"><div class=\"field-set-info\"><field-info ng-repeat=\"field in fieldSet\" ng-if=\"fieldSet\" field=\"field\" show-type=\"true\" ng-class=\"{ selected: alwaysSelected || (isSelected && isSelected(field.name)), unselected: isSelected && !isSelected(field.name), highlighted: (highlighted||{})[field.name] }\" ng-mouseover=\"(highlighted||{})[field.name] = true\" ng-mouseout=\"(highlighted||{})[field.name] = false\"></field-info></div><div class=\"toolbox\"><a ng-if=\"consts.debug && showDebug\" class=\"command debug\"><i class=\"fa fa-wrench\" ng-click=\"shCopied=\'\'; vlCopied=\'\'; vgCopied=\'\';\" ng-mouseover=\"initializePopup();\"></i></a><vl-plot-group-popup ng-if=\"consts.debug && showDebug && renderPopup\"></vl-plot-group-popup><a ng-if=\"showMarkType\" class=\"command disabled\"><i class=\"fa fa-font\"></i> <i class=\"fa fa-line-chart\"></i> <i class=\"fa fa-area-chart\"></i> <i class=\"fa fa-bar-chart\"></i> <i class=\"fa fa-circle-o\"></i></a> <a ng-if=\"showLog && chart.vlSpec && log.support(chart.vlSpec, \'x\')\" class=\"command\" ng-click=\"log.toggle(chart.vlSpec, \'x\')\" ng-class=\"{active: log.active(chart.vlSpec, \'x\')}\"><i class=\"fa fa-long-arrow-right\"></i> <small>Log X</small></a> <a ng-if=\"showLog && chart.vlSpec && log.support(chart.vlSpec, \'y\')\" class=\"command\" ng-click=\"log.toggle(chart.vlSpec, \'y\')\" ng-class=\"{active: log.active(chart.vlSpec, \'y\')}\"><i class=\"fa fa-long-arrow-up\"></i> <small>Log Y</small></a> <a ng-if=\"showSort && chart.vlSpec && toggleSort.support(chart.vlSpec, Dataset.stats)\" class=\"command\" ng-click=\"toggleSort.toggle(chart.vlSpec)\"><i class=\"fa sort\" ng-class=\"toggleSortClass(chart.vlSpec)\"></i> <small ng-if=\"showLabel\">Sort</small></a> <a ng-if=\"showFilterNull && chart.vlSpec && toggleFilterNull.support(chart.vlSpec, Dataset.stats)\" class=\"command\" ng-click=\"toggleFilterNull(chart.vlSpec)\" ng-class=\"{active: chart.vlSpec && chart.vlSpec.cfg.filterNull.O}\"><i class=\"fa fa-filter\"></i> <small ng-if=\"showLabel\">Filter</small> <small>NULL</small></a> <a ng-if=\"showTranspose\" class=\"command\" ng-click=\"transpose()\"><i class=\"fa fa-refresh transpose\"></i> <small ng-if=\"showLabel\">Swap X/Y</small></a> <a ng-if=\"showBookmark && Bookmarks.isSupported\" class=\"command\" ng-click=\"Bookmarks.toggle(chart)\" ng-class=\"{disabled: !chart.vlSpec.encoding, active: Bookmarks.isBookmarked(chart.shorthand)}\"><i class=\"fa fa-bookmark\"></i> <small ng-if=\"showLabel\">Bookmark</small></a> <a ng-if=\"showExpand\" ng-click=\"expandAction()\" class=\"command\"><i class=\"fa fa-expand\"></i></a></div></div><div class=\"vl-plot-wrapper full-width vis-{{fieldSet.key}} flex-grow-1\"><vl-plot chart=\"chart\" disabled=\"disabled\" is-in-list=\"isInList\" always-scrollable=\"alwaysScrollable\" config-set=\"{{configSet||\'small\'}}\" max-height=\"maxHeight\" max-width=\"maxWidth\" overflow=\"overflow\" priority=\"priority\" rescale=\"rescale\" thumbnail=\"thumbnail\" tooltip=\"tooltip\"></vl-plot></div></div>");
$templateCache.put("vlplotgroup/vlplotgrouppopup.html","<div class=\"drop-container\"><div class=\"popup-menu popup-command no-shrink dev-tool\"><div class=\"command debug\"><span class=\"debug\">Vls</span> <a class=\"debug\" ui-zeroclip=\"\" zeroclip-copied=\"shCopied=\'(Copied)\'\" zeroclip-model=\"chart.shorthand\">Copy</a> / <a class=\"debug\" ng-click=\"logCode(\'VL shorthand\', chart.shorthand); shCopied=\'(Logged)\';\">Log</a> <span>{{shCopied}}</span></div><div class=\"command debug\"><span class=\"debug\">Vl</span> <a class=\"debug\" ui-zeroclip=\"\" zeroclip-copied=\"vlCopied=\'(Copied)\'\" zeroclip-model=\"chart.cleanSpec | compactJSON\">Copy</a> / <a class=\"debug\" ng-click=\"logCode(\'Vega-lite\', chart.cleanSpec); vlCopied=\'(Logged)\';\">Log</a> <span>{{vlCopied}}</span></div><div class=\"command debug\"><span class=\"debug\">Vg</span> <a class=\"debug\" ui-zeroclip=\"\" zeroclip-copied=\"vgCopied=\'(Copied)\'\" zeroclip-model=\"chart.vgSpec | compactJSON\">Copy</a> / <a class=\"debug\" ng-click=\"logCode(\'Vega\', chart.vgSpec); vgCopied=\'(Logged)\';\">Log</a> <span>{{vgCopied}}</span></div><a class=\"command debug\" ng-href=\"{{ {type:\'vl\', encoding: chart.cleanSpec} | reportUrl }}\" target=\"_blank\">Report Bad Render</a> <a ng-click=\"showFeature=!showFeature\" class=\"command debug\">{{chart.score}}</a><div ng-repeat=\"f in chart.scoreFeatures track by f.reason\">[{{f.score}}] {{f.reason}}</div></div></div>");}]);
}());

;(function() {
'use strict';

angular.module('vlui')
  .directive('alertMessages', ['Alerts', function(Alerts) {
    return {
      templateUrl: 'alertmessages/alertmessages.html',
      restrict: 'E',
      scope: {},
      link: function(scope /*, element, attrs*/) {
        scope.Alerts = Alerts;
      }
    };
  }]);
}());

;(function() {
'use strict';

angular.module('vlui')
  .service('Alerts', ['$timeout', '_', function($timeout, _) {
    var Alerts = {};

    Alerts.alerts = [];

    Alerts.add = function(msg, dismiss) {
      var message = {msg: msg};
      Alerts.alerts.push(message);
      if (dismiss) {
        $timeout(function() {
          var index = _.findIndex(Alerts.alerts, message);
          Alerts.closeAlert(index);
        }, dismiss);
      }
    };

    Alerts.closeAlert = function(index) {
      Alerts.alerts.splice(index, 1);
    };

    return Alerts;
  }]);
}());

;(function() {
'use strict';

/**
 * @ngdoc service
 * @name vlui.Bookmarks
 * @description
 * # Bookmarks
 * Service in the vlui.
 */
angular.module('vlui')
  .service('Bookmarks', ['_', 'vl', 'localStorageService', 'Logger', 'Dataset', function(_, vl, localStorageService, Logger, Dataset) {
    var Bookmarks = function() {
      this.dict = {};
      this.length = 0;
      this.isSupported = localStorageService.isSupported;
    };

    var proto = Bookmarks.prototype;

    proto.updateLength = function() {
      this.length = Object.keys(this.dict).length;
    };

    proto.save = function() {
      localStorageService.set('bookmarks', this.dict);
    };

    proto.load = function() {
      this.dict = localStorageService.get('bookmarks') || {};
      this.updateLength();
    };

    proto.clear = function() {
      this.dict = {};
      this.updateLength();
      this.save();

      Logger.logInteraction(Logger.actions.BOOKMARK_CLEAR);
    };

    proto.toggle = function(chart) {
      var shorthand = chart.shorthand;

      if (this.dict[shorthand]) {
        this.remove(chart);
      } else {
        this.add(chart);
      }
    };

    proto.add = function(chart) {
      var shorthand = chart.shorthand;

      console.log('adding', chart.vlSpec, shorthand);

      chart.timeAdded = (new Date().getTime());

      chart.stats = Dataset.stats;

      this.dict[shorthand] = _.cloneDeep(chart);
      this.updateLength();
      this.save();

      Logger.logInteraction(Logger.actions.BOOKMARK_ADD, shorthand);
    };

    proto.remove = function(chart) {
      var shorthand = chart.shorthand;

      console.log('removing', chart.vlSpec, shorthand);

      delete this.dict[shorthand];
      this.updateLength();
      this.save();

      Logger.logInteraction(Logger.actions.BOOKMARK_REMOVE, shorthand);
    };

    proto.isBookmarked = function(shorthand) {
      return shorthand in this.dict;
    };

    return new Bookmarks();
  }]);
}());

;(function() {
'use strict';

/**
 * @ngdoc directive
 * @name vlui.directive:bookmarkList
 * @description
 * # bookmarkList
 */
angular.module('vlui')
  .directive('bookmarkList', ['Bookmarks', 'consts', 'Logger', function (Bookmarks, consts, Logger) {
    return {
      templateUrl: 'bookmarklist/bookmarklist.html',
      restrict: 'E',
      replace: true,
      scope: {
        highlighted: '='
      },
      link: function postLink(scope /*, element, attrs*/) {
        // The bookmark list is designed to render within a modal overlay.
        // Because modal contents are hidden via ng-if, if this link function is
        // executing it is because the directive is being shown. Log the event:
        Logger.logInteraction(Logger.actions.BOOKMARK_OPEN);
        scope.logBookmarksClosed = function() {
          Logger.logInteraction(Logger.actions.BOOKMARK_CLOSE);
        };

        scope.Bookmarks = Bookmarks;
        scope.consts = consts;
      }
    };
  }]);
}());

;(function() {
'use strict';

// Service for the spec config.
// We keep this separate so that changes are kept even if the spec changes.
angular.module('vlui')
  .factory('Config', ['vl', '_', function(vl, _) {
    var Config = {};

    Config.schema = vl.schema.schema.properties.config;
    Config.dataschema = vl.schema.schema.properties.data;

    Config.data = vl.schema.util.instantiate(Config.dataschema);
    Config.config = vl.schema.util.instantiate(Config.schema);

    Config.getConfig = function() {
      return _.cloneDeep(Config.config);
    };

    Config.getData = function() {
      return Config.data;
    };

    Config.large = function() {
      return {
        singleWidth: 400,
        singleHeight: 400,
        largeBandMaxCardinality: 20
      };
    };

    Config.small = function() {
      return {};
    };

    Config.updateDataset = function(dataset, type) {
      if (dataset.values) {
        Config.data.values = dataset.values;
        delete Config.data.url;
        Config.data.formatType = undefined;
      } else {
        Config.data.url = dataset.url;
        delete Config.data.values;
        Config.data.formatType = type;
      }
    };

    return Config;
  }]);
}());

;(function() {
'use strict';

/**
 * @ngdoc directive
 * @name vlui.directive:addMyriaDataset
 * @description
 * # addMyriaDataset
 */
angular.module('vlui')
  .directive('addMyriaDataset', ['$http', 'Dataset', 'consts', function ($http, Dataset, consts) {
    return {
      templateUrl: 'dataset/addmyriadataset.html',
      restrict: 'E',
      require: '?^^modal',
      replace: true,
      scope: true,
      link: function postLink(scope, element, attrs, modalController) {
        // If this directive occurs within a a modal, give ourselves a way to close
        // that modal once the add button has been clicked
        function closeModal() {
          if (modalController) {
            modalController.close();
          }
        }

        // Initialize scope variables
        scope.myriaRestUrl = consts.myriaRest;
        scope.myriaDatasets = [];
        scope.myriaDataset = null;

        scope.loadDatasets = function(query) {
          return $http.get(scope.myriaRestUrl + '/dataset/search/?q=' + query)
            .then(function(response) {
              scope.myriaDatasets = response.data;
            });
        };

        // Load the available datasets from Myria
        scope.loadDatasets('');

        scope.optionName = function(dataset) {
          return dataset.userName + ':' + dataset.programName + ':' + dataset.relationName;
        };

        scope.addDataset = function(myriaDataset) {
          var dataset = {
            group: 'myria',
            name: myriaDataset.relationName,
            url: scope.myriaRestUrl + '/dataset/user-' + myriaDataset.userName +
              '/program-' + myriaDataset.programName +
              '/relation-' + myriaDataset.relationName + '/data?format=json'
          };

          Dataset.type = 'json';
          Dataset.dataset = Dataset.add(dataset);
          Dataset.update(Dataset.dataset);

          closeModal();
        };
      }
    };
  }]);
}());

;(function() {
'use strict';

/**
 * @ngdoc directive
 * @name vlui.directive:addUrlDataset
 * @description
 * # addUrlDataset
 */
angular.module('vlui')
  .directive('addUrlDataset', ['Dataset', 'Logger', function (Dataset, Logger) {
    return {
      templateUrl: 'dataset/addurldataset.html',
      restrict: 'E',
      require: '?^^modal',
      replace: true,
      scope: true,
      link: function postLink(scope, element, attrs, modalController) {
        // If this directive occurs within a a modal, give ourselves a way to close
        // that modal once the add button has been clicked
        function closeModal() {
          if (modalController) {
            modalController.close();
          }
        }

        // the dataset to add
        scope.addedDataset = {
          group: 'user'
        };

        scope.addFromUrl = function(dataset) {
          Logger.logInteraction(Logger.actions.DATASET_NEW_URL, dataset.url);

          // Register the new dataset
          Dataset.dataset = Dataset.add(dataset);

          // Fetch & activate the newly-registered dataset
          Dataset.update(Dataset.dataset);

          closeModal();
        };
      }
    };
  }]);
}());

;(function() {
'use strict';

/**
 * @ngdoc filter
 * @name vega-lite-ui.filter:inGroup
 * @function
 * @description
 * # inGroup
 * Get datasets in a particular group
 * @param  {String} datasetGroup One of "sample," "user", or "myria"
 * @return {Array} An array of datasets in the specified group
 */
angular.module('vlui')
  .filter('inGroup', ['_', function(_) {
    return function(arr, datasetGroup) {
      return _.where(arr, {
        group: datasetGroup
      });
    };
  }]);

/**
 * @ngdoc directive
 * @name vlui.directive:changeLoadedDataset
 * @description
 * # changeLoadedDataset
 */
angular.module('vlui')
  .directive('changeLoadedDataset', ['Dataset', '_', function (Dataset, _) {
    return {
      templateUrl: 'dataset/changeloadeddataset.html',
      restrict: 'E',
      require: '?^^modal',
      replace: true,
      scope: true,
      link: function postLink(scope, element, attrs, modalController) {
        // If this directive occurs within a a modal, give ourselves a way to close
        // that modal once the add button has been clicked
        function closeModal() {
          if (modalController) {
            modalController.close();
          }
        }

        // Expose dataset object itself so current dataset can be marked
        scope.Dataset = Dataset;

        scope.userData = _.filter(Dataset.datasets, function(dataset) {
          return dataset.group !== 'sample';
        });

        scope.sampleData = _.where(Dataset.datasets, {
          group: 'sample'
        });

        scope.$watch(function() {
          return Dataset.datasets.length;
        }, function() {
          scope.userData = _.filter(Dataset.datasets, function(dataset) {
            return dataset.group !== 'sample';
          });
        });

        scope.selectDataset = function(dataset) {
          // Activate the selected dataset
          Dataset.update(dataset);
          closeModal();
        };
      }
    };
  }]);
}());

;(function() {
'use strict';

function getNameMap(dataschema) {
  return dataschema.reduce(function(m, field) {
    m[field.name] = field;
    return m;
  }, {});
}

angular.module('vlui')
  .factory('Dataset', ['$http', '$q', 'Alerts', '_', 'dl', 'vl', 'SampleData', 'Config', 'Logger', function($http, $q, Alerts, _, dl, vl, SampleData, Config, Logger) {
    var Dataset = {};

    // Start with the list of sample datasets
    var datasets = SampleData;

    Dataset.datasets = datasets;
    Dataset.dataset = datasets[1];
    Dataset.currentDataset = undefined;  // dataset before update
    Dataset.dataschema = [];
    Dataset.dataschema.byName = {};
    Dataset.stats = {};
    Dataset.type = undefined;

    var typeOrder = {
      N: 0,
      O: 0,
      G: 2,
      T: 3,
      Q: 4
    };

    Dataset.fieldOrderBy = {};

    Dataset.fieldOrderBy.type = function(field) {
      if (field.aggregate==='count') return 4;
      return typeOrder[field.type];
    };

    Dataset.fieldOrderBy.typeThenName = function(field) {
      return Dataset.fieldOrderBy.type(field) + '_' +
        (field.aggregate === 'count' ? '~' : field.name.toLowerCase());
        // ~ is the last character in ASCII
    };

    Dataset.fieldOrderBy.original = function() {
      return 0; // no swap will occur
    };

    Dataset.fieldOrderBy.name = function(field) {
      return field.name;
    };

    Dataset.fieldOrderBy.cardinality = function(field, stats) {
      return stats[field.name].distinct;
    };

    Dataset.fieldOrder = Dataset.fieldOrderBy.typeThenName;

    Dataset.getSchema = function(data, stats, order) {
      var types = dl.type.inferAll(data),
        schema = _.reduce(types, function(s, type, name) {
          var field = {
            name: name,
            type: vl.data.types[type],
            primitiveType: type
          };

          if (field.type === 'Q' && stats[field.name].distinct <= 5) {
            field.type = 'O';
          }

          s.push(field);
          return s;
        }, []);

      schema = dl.stablesort(schema, order || Dataset.fieldOrderBy.typeThenName, Dataset.fieldOrderBy.name);

      schema.push(vl.encDef.count());
      return schema;
    };

    // update the schema and stats
    Dataset.onUpdate = [];

    Dataset.update = function(dataset) {
      var updatePromise;

      Logger.logInteraction(Logger.actions.DATASET_CHANGE, dataset.name);

      if (dataset.values) {
        updatePromise = $q(function(resolve, reject) {
          // jshint unused:false
          Dataset.type = undefined;
          Dataset.updateFromData(dataset, dataset.values);
          resolve();
        });
      } else {
        updatePromise = $http.get(dataset.url, {cache: true}).then(function(response) {
          var data;

          // first see whether the data is JSON, otherwise try to parse CSV
          if (_.isObject(response.data)) {
             data = response.data;
             Dataset.type = 'json';
          } else {
            data = dl.read(response.data, {type: 'csv'});
            Dataset.type = 'csv';
          }

          Dataset.updateFromData(dataset, data);
        });
      }

      Dataset.onUpdate.forEach(function(listener) {
        updatePromise = updatePromise.then(listener);
      });

      // Copy the dataset into the config service once it is ready
      updatePromise.then(function() {
        Config.updateDataset(dataset, Dataset.type);
      });

      return updatePromise;
    };

    Dataset.updateFromData = function(dataset, data) {
      Dataset.data = data;

      Dataset.currentDataset = dataset;
      Dataset.stats = vl.data.stats(Dataset.data);

      for (var fieldName in Dataset.stats) {
        if (fieldName !== '*') {
          Dataset.stats[fieldName].sample = _.sample(_.pluck(Dataset.data, fieldName), 7);
        }
      }

      Dataset.dataschema = Dataset.getSchema(Dataset.data, Dataset.stats);
      Dataset.dataschema.byName = getNameMap(Dataset.dataschema);
    };

    Dataset.add = function(dataset) {
      if (!dataset.id) {
        dataset.id = dataset.url;
      }
      datasets.push(dataset);

      return dataset;
    };

    return Dataset;
  }]);
}());

;(function() {
'use strict';

/**
 * @ngdoc directive
 * @name vlui.directive:datasetModal
 * @description
 * # datasetModal
 */
angular.module('vlui')
  .directive('datasetModal', function () {
    return {
      templateUrl: 'dataset/datasetmodal.html',
      restrict: 'E',
      scope: false
    };
  });
}());

;(function() {
'use strict';

angular.module('vlui')
  .directive('datasetSelector', ['Modals', 'Logger', function(Modals, Logger) {
    return {
      templateUrl: 'dataset/datasetselector.html',
      restrict: 'E',
      replace: true,
      scope: {},
      link: function postLink(scope/*, element, attrs*/) {
        scope.loadDataset = function() {
          Logger.logInteraction(Logger.actions.DATASET_OPEN);
          Modals.open('dataset-modal');
        };
      }
    };
  }]);
}());

;(function() {
'use strict';

/**
 * @ngdoc directive
 * @name vlui.directive:fileDropzone
 * @description
 * # fileDropzone
 */
angular.module('vlui')
  // Add the file reader as a named dependency
  .constant('FileReader', window.FileReader)
  .directive('fileDropzone', ['Modals', 'Alerts', 'FileReader', function (Modals, Alerts, FileReader) {

    // Helper methods

    function isSizeValid(size, maxSize) {
      // Size is provided in bytes; maxSize is provided in megabytes
      // Coerce maxSize to a number in case it comes in as a string,
      // & return true when max file size was not specified, is empty,
      // or is sufficiently large
      return !maxSize || ( size / 1024 / 1024 < +maxSize );
    }

    function isTypeValid(type, validMimeTypes) {
        // If no mime type restrictions were provided, or the provided file's
        // type is whitelisted, type is valid
      return !validMimeTypes || ( validMimeTypes.indexOf(type) > -1 );
    }

    return {
      templateUrl: 'dataset/filedropzone.html',
      replace: true,
      restrict: 'E',
      // Permit arbitrary child content
      transclude: true,
      scope: {
        maxFileSize: '@',
        validMimeTypes: '@',
        // Expose this directive's dataset property to parent scopes through
        // two-way databinding
        dataset: '='
      },
      link: function (scope, element/*, attrs*/) {
        scope.dataset = scope.dataset || {};

        element.on('dragover dragenter', function onDragEnter(event) {
          if (event) {
            event.preventDefault();
          }
          event.originalEvent.dataTransfer.effectAllowed = 'copy';
        });

        function readFile(file) {
          if (!isTypeValid(file.type, scope.validMimeTypes)) {
            scope.$apply(function() {
              Alerts.add('Invalid file type. File must be one of following types: ' + scope.validMimeTypes);
            });
            return;
          }
          if (!isSizeValid(file.size, scope.maxFileSize)) {
            scope.$apply(function() {
              Alerts.add('File must be smaller than ' + scope.maxFileSize + ' MB');
            });
            return;
          }
          var reader = new FileReader();

          reader.onload = function(evt) {
            return scope.$apply(function(scope) {
              scope.dataset.data = evt.target.result;
              // Strip file name extensions from the uploaded data
              scope.dataset.name = file.name.replace(/\.\w+$/, '');
            });
          };

          reader.onerror = function() {
            Alerts.add('Error reading file');
          };

          reader.readAsText(file);
        }

        element.on('drop', function onDrop(event) {
          if (event) {
            event.preventDefault();
          }

          readFile(event.originalEvent.dataTransfer.files[0]);
        });

        element.find('input[type="file"]').on('change', function onUpload(/*event*/) {
          // "this" is the input element
          readFile(this.files[0]);
        });
      }

    };
  }]);
}());

;(function() {
'use strict';

/**
 * @ngdoc directive
 * @name vlui.directive:pasteDataset
 * @description
 * # pasteDataset
 */
angular.module('vlui')
  .directive('pasteDataset', ['Dataset', 'Logger', 'Config', '_', 'dl', function (Dataset, Logger, Config, _, dl) {
    return {
      templateUrl: 'dataset/pastedataset.html',
      restrict: 'E',
      require: '?^^modal',
      replace: true,
      scope: true,
      link: function postLink(scope, element, attrs, modalController) {
        // If this directive occurs within a a modal, give ourselves a way to close
        // that modal once the add button has been clicked
        function closeModal() {
          if (modalController) {
            modalController.close();
          }
        }

        // Initialize scope variables
        scope.dataset = {
          name: '',
          data: ''
        };

        scope.addDataset = function() {
          var data = dl.read(scope.dataset.data, {
            type: 'csv'
          });

          var pastedDataset = {
            id: Date.now(),  // time as id
            name: scope.dataset.name,
            values: data,
            group: 'pasted'
          };

          // Log that we have pasted data
          Logger.logInteraction(Logger.actions.DATASET_NEW_PASTE, pastedDataset.name);

          // Register the pasted data as a new dataset
          Dataset.dataset = Dataset.add(pastedDataset);

          // Activate the newly-registered dataset
          Dataset.update(Dataset.dataset);

          // Close this directive's containing modal
          closeModal();
        };
      }
    };
  }]);
}());

;(function() {
angular.module('vlui').constant('SampleData', [{
  name: 'Barley',
  description: 'Barley yield by variety across the upper midwest in 1931 and 1932',
  url: 'data/barley.json',
  id: 'barley',
  group: 'sample'
},{
  name: 'Cars',
  description: 'Automotive statistics for a variety of car models between 1970 & 1982',
  url: 'data/cars.json',
  id: 'cars',
  group: 'sample'
},{
  name: 'Crimea',
  url: 'data/crimea.json',
  id: 'crimea',
  group: 'sample'
},{
  name: 'Driving',
  url: 'data/driving.json',
  id: 'driving',
  group: 'sample'
},{
  name: 'Iris',
  url: 'data/iris.json',
  id: 'iris',
  group: 'sample'
},{
  name: 'Jobs',
  url: 'data/jobs.json',
  id: 'jobs',
  group: 'sample'
},{
  name: 'Population',
  url: 'data/population.json',
  id: 'population',
  group: 'sample'
},{
  name: 'Movies',
  url: 'data/movies.json',
  id: 'movies',
  group: 'sample'
},{
  name: 'Birdstrikes',
  url: 'data/birdstrikes.json',
  id: 'birdstrikes',
  group: 'sample'
},{
  name: 'Burtin',
  url: 'data/burtin.json',
  id: 'burtin',
  group: 'sample'
},{
  name: 'Budget 2016',
  url: 'data/budget.json',
  id: 'budget',
  group: 'sample'
},{
  name: 'Climate Normals',
  url: 'data/climate.json',
  id: 'climate',
  group: 'sample'
},{
  name: 'Campaigns',
  url: 'data/weball26.json',
  id: 'weball26',
  group: 'sample'
}]);
}());

;(function() {
'use strict';

/**
 * @ngdoc directive
 * @name vlui.directive:fieldInfo
 * @description
 * # fieldInfo
 */
angular.module('vlui')
  .directive('fieldInfo', ['Dataset', 'Drop', 'vl', 'consts', function (Dataset, Drop, vl, consts) {
    return {
      templateUrl: 'fieldinfo/fieldinfo.html',
      restrict: 'E',
      replace: true,
      scope: {
        field: '=',
        showType: '=',
        showInfo: '=',
        showCaret: '=',
        popupContent: '=',
        showRemove: '=',
        removeAction: '&',
        action: '&',
        disableCountCaret: '='
      },
      link: function(scope, element) {
        var funcsPopup;

        scope.typeNames = consts.typeNames;
        scope.stats = Dataset.stats[scope.field.name];
        scope.isTypes = vl.encDef.isTypes;

        switch(scope.field.type){
          case 'O':
            scope.icon = 'fa-font';
            break;
          case 'N':
            scope.icon = 'fa-font';
            break;
          case 'Q':
            scope.icon = 'icon-hash';
            break;
          case 'T':
            scope.icon = 'fa-calendar';
            break;
        }

        scope.clicked = function($event){
          if(scope.action && $event.target !== element.find('.fa-caret-down')[0] &&
            $event.target !== element.find('span.type')[0]) {
            scope.action($event);
          }
        };

        scope.func = function(field) {
          return field.aggregate || field.timeUnit ||
            (field.bin && 'bin') ||
            field._aggregate || field._timeUnit ||
            (field._bin && 'bin') || (field._any && 'auto');
        };

        scope.$watch('popupContent', function(popupContent) {
          if (!popupContent) { return; }

          if (funcsPopup) {
            funcsPopup.destroy();
          }

          funcsPopup = new Drop({
            content: popupContent,
            target: element.find('.type-caret')[0],
            position: 'bottom left',
            openOn: 'click'
          });
        });

        scope.$on('$destroy', function() {
          if (funcsPopup) {
            funcsPopup.destroy();
          }
        });
      }
    };
  }]);
}());

;(function() {
'use strict';

/**
 * @ngdoc service
 * @name vega-lite-ui.logger
 * @description
 * # logger
 * Service in the vega-lite-ui.
 */
angular.module('vlui')
  .service('Logger', ['$location', '$window', 'consts', 'Analytics', function ($location, $window, consts, Analytics) {

    var service = {};

    service.levels = {
      OFF: {id:'OFF', rank:0},
      TRACE: {id:'TRACE', rank:1},
      DEBUG: {id:'DEBUG', rank:2},
      INFO: {id:'INFO', rank:3},
      WARN: {id:'WARN', rank:4},
      ERROR: {id:'ERROR', rank:5},
      FATAL: {id:'FATAL', rank:6}
    };

    service.actions = {
      // DATA
      INITIALIZE: {category: 'DATA', id: 'INITIALIZE', level: service.levels.DEBUG},
      UNDO: {category: 'DATA', id: 'UNDO', level: service.levels.INFO},
      REDO: {category: 'DATA', id: 'REDO', level: service.levels.INFO},
      DATASET_CHANGE: {category: 'DATA', id: 'DATASET_CHANGE', level: service.levels.INFO},
      DATASET_OPEN: {category: 'DATA', id: 'DATASET_OPEN', level: service.levels.INFO},
      DATASET_NEW_PASTE: {category: 'DATA', id: 'DATASET_NEW_PASTE', level: service.levels.INFO},
      DATASET_NEW_URL: {category: 'DATA', id: 'DATASET_NEW_URL', level: service.levels.INFO},
      // BOOKMARK
      BOOKMARK_ADD: {category: 'BOOKMARK', id:'BOOKMARK_ADD', level: service.levels.INFO},
      BOOKMARK_REMOVE: {category: 'BOOKMARK', id:'BOOKMARK_REMOVE', level: service.levels.INFO},
      BOOKMARK_OPEN: {category: 'BOOKMARK', id:'BOOKMARK_OPEN', level: service.levels.INFO},
      BOOKMARK_CLOSE: {category: 'BOOKMARK', id:'BOOKMARK_CLOSE', level: service.levels.INFO},
      BOOKMARK_CLEAR: {category: 'BOOKMARK', id: 'BOOKMARK_CLEAR', level: service.levels.INFO},
      // CHART
      CHART_MOUSEOVER: {category: 'CHART', id:'CHART_MOUSEOVER', level: service.levels.DEBUG},
      CHART_MOUSEOUT: {category: 'CHART', id:'CHART_MOUSEOUT', level: service.levels.DEBUG},
      CHART_RENDER: {category: 'CHART', id:'CHART_RENDER', level: service.levels.DEBUG},
      CHART_EXPOSE: {category: 'CHART', id:'CHART_EXPOSE', level: service.levels.DEBUG},
      CHART_TOOLTIP: {category: 'CHART', id:'CHART_TOOLTIP', level: service.levels.DEBUG},
      CHART_TOOLTIP_END: {category: 'CHART', id:'CHART_TOOLTIP_END', level: service.levels.DEBUG},

      SORT_TOGGLE: {category: 'CHART', id:'SORT_TOGGLE', level: service.levels.INFO},
      MARKTYPE_TOGGLE: {category: 'CHART', id:'MARKTYPE_TOGGLE', level: service.levels.INFO},
      DRILL_DOWN_OPEN: {category: 'CHART', id:'DRILL_DOWN_OPEN', level: service.levels.INFO},
      DRILL_DOWN_CLOSE: {category: 'CHART', id: 'DRILL_DOWN_CLOSE', level: service.levels.INFO},
      LOG_TOGGLE: {category: 'CHART', id: 'LOG_TOGGLE', level: service.levels.INFO},
      TRANSPOSE_TOGGLE: {category: 'CHART', id: 'TRANSPOSE_TOGGLE', level: service.levels.INFO},
      NULL_FILTER_TOGGLE: {category: 'CHART', id:'NULL_FILTER_TOGGLE', level: service.levels.INFO},

      CLUSTER_SELECT: {category: 'CHART', id:'CLUSTER_SELECT', level: service.levels.INFO},
      LOAD_MORE: {category: 'CHART', id:'LOAD_MORE', level: service.levels.INFO},

      // FIELDS
      FIELDS_CHANGE: {category: 'FIELDS', id: 'FIELDS_CHANGE', level: service.levels.INFO},
      FIELDS_RESET: {category: 'FIELDS', id: 'FIELDS_RESET', level: service.levels.INFO},
      FUNC_CHANGE: {category: 'FIELDS', id: 'FUNC_CHANGE', level: service.levels.INFO},

      //POLESTAR
      SPEC_CHANGE: {category:'POLESTAR', id: 'SPEC_CHANGE', level: service.levels.DEBUG},
      FIELD_DROP: {category: 'POLESTAR', id: 'FIELD_DROP', level: service.levels.DEBUG},
      MARK_CHANGE: {category: 'POLESTAR', id: 'MARK_CHANGE', level: service.levels.DEBUG}
    };

    service.logInteraction = function(action, label, data) {
      if (!consts.logging) {
        return;
      }
      var value = data ? data.value : undefined;
      if(action.level.rank >= service.levels.INFO.rank) {
        Analytics.trackEvent(action.category, action.id, label, value);
        console.log('[Logging] ', action.id, label, data);
      }
    };

    service.logInteraction(service.actions.INITIALIZE, consts.appId);

    return service;
  }]);
}());

;(function() {
'use strict';

/**
 * @ngdoc directive
 * @name vlui.directive:modal
 * @description
 * # modal
 */
angular.module('vlui')
  .directive('modal', ['Modals', function (Modals) {
    return {
      templateUrl: 'modal/modal.html',
      restrict: 'E',
      transclude: true,
      scope: {
        autoOpen: '=',
        maxWidth: '@'
      },
      // Provide an interface for child directives to close this modal
      controller: ['$scope', function($scope) {
        this.close = function() {
          $scope.isOpen = false;
        };
      }],
      link: function(scope, element, attrs) {
        var modalId = attrs.id;

        if (scope.maxWidth) {
          scope.wrapperStyle = 'max-width:' + scope.maxWidth;
        }

        // Default to closed unless autoOpen is set
        scope.isOpen = scope.autoOpen;

        // Register this modal with the service
        Modals.register(modalId, scope);
        scope.$on('$destroy', function() {
          Modals.deregister(modalId);
        });
      }
    };
  }]);
}());

;(function() {
'use strict';

/**
 * @ngdoc directive
 * @name vlui.directive:modalCloseButton
 * @description
 * # modalCloseButton
 */
angular.module('vlui')
  .directive('modalCloseButton', function() {
    return {
      templateUrl: 'modal/modalclosebutton.html',
      restrict: 'E',
      require: '^^modal',
      scope: {
        'closeCallback': '&onClose'
      },
      link: function(scope, element, attrs, modalController) {
        scope.closeModal = function() {
          modalController.close();
          if (scope.closeCallback) {
            scope.closeCallback();
          }
        };
      }
    };
  });
}());

;(function() {
'use strict';

/**
 * @ngdoc service
 * @name vlui.Modals
 * @description
 * # Modals
 * Service used to control modal visibility from anywhere in the application
 */
angular.module('vlui')
  .factory('Modals', ['$cacheFactory', function ($cacheFactory) {

    // TODO: The use of scope here as the method by which a modal directive
    // is registered and controlled may need to change to support retrieving
    // data from a modal as may be needed in #77
    var modalsCache = $cacheFactory('modals');

    // Public API
    return {
      register: function(id, scope) {
        if (modalsCache.get(id)) {
          console.error('Cannot register two modals with id ' + id);
          return;
        }
        modalsCache.put(id, scope);
      },

      deregister: function(id) {
        modalsCache.remove(id);
      },

      // Open a modal
      open: function(id) {
        var modalScope = modalsCache.get(id);
        if (!modalScope) {
          console.error('Unregistered modal id ' + id);
          return;
        }
        modalScope.isOpen = true;
      },

      // Close a modal
      close: function(id) {
        var modalScope = modalsCache.get(id);
        if (!modalScope) {
          console.error('Unregistered modal id ' + id);
          return;
        }
        modalScope.isOpen = false;
      },

      empty: function() {
        modalsCache.removeAll();
      },

      count: function() {
        return modalsCache.info().size;
      }
    };
  }]);
}());

;(function() {
'use strict';

/**
 * @ngdoc directive
 * @name vlui.directive:tab
 * @description
 * # tab
 */
angular.module('vlui')
  .directive('tab', function() {
    return {
      templateUrl: 'tabs/tab.html',
      restrict: 'E',
      require: '^^tabset',
      replace: true,
      transclude: true,
      scope: {
        heading: '@'
      },
      link: function(scope, element, attrs, tabsetController) {
        tabsetController.addTab(scope);
      }
    };
  });
}());

;(function() {
'use strict';

/**
 * @ngdoc directive
 * @name vlui.directive:tabset
 * @description
 * # tabset
 */
angular.module('vlui')
  .directive('tabset', function() {
    return {
      templateUrl: 'tabs/tabset.html',
      restrict: 'E',
      transclude: true,

      // Interface for tabs to register themselves
      controller: function() {
        var self = this;

        this.tabs = [];

        this.addTab = function(tabScope) {
          // First tab is always auto-activated; others auto-deactivated
          tabScope.active = self.tabs.length === 0;
          self.tabs.push(tabScope);
        };

        this.showTab = function(selectedTab) {
          self.tabs.forEach(function(tab) {
            // Activate the selected tab, deactivate all others
            tab.active = tab === selectedTab;
          });
        };
      },

      // Expose controller to templates as "tabset"
      controllerAs: 'tabset'
    };
  });
}());

;(function() {
'use strict';

angular.module('vlui')
  .directive('vlPlot', ['dl', 'vl', 'vg', '$timeout', '$q', 'Dataset', 'Config', 'consts', '_', '$document', 'Logger', 'Heap', '$window', function(dl, vl, vg, $timeout, $q, Dataset, Config, consts, _, $document, Logger, Heap, $window) {
    var counter = 0;
    var MAX_CANVAS_SIZE = 32767/2, MAX_CANVAS_AREA = 268435456/4;

    var renderQueue = new Heap(function(a, b){
        return b.priority - a.priority;
      }),
      rendering = false;

    function getRenderer(width, height) {
      // use canvas by default but use svg if the visualization is too big
      if (width > MAX_CANVAS_SIZE || height > MAX_CANVAS_SIZE || width*height > MAX_CANVAS_AREA) {
        return 'svg';
      }
      return 'canvas';
    }

    return {
      templateUrl: 'vlplot/vlplot.html',
      restrict: 'E',
      scope: {
        chart: '=',

        //optional
        disabled: '=',
        isInList: '=',

        alwaysScrollable: '=',
        configSet: '@',
        maxHeight:'=',
        maxWidth: '=',
        overflow: '=',
        priority: '=',
        rescale: '=',
        thumbnail: '=',
        tooltip: '=',
      },
      replace: true,
      link: function(scope, element) {
        var HOVER_TIMEOUT = 500,
          TOOLTIP_TIMEOUT = 250;

        scope.visId = (counter++);
        scope.hoverPromise = null;
        scope.tooltipPromise = null;
        scope.hoverFocus = false;
        scope.tooltipActive = false;
        scope.destroyed = false;
        var format = vl.format('');

        scope.mouseover = function() {
          scope.hoverPromise = $timeout(function(){
            Logger.logInteraction(Logger.actions.CHART_MOUSEOVER, '', scope.chart.vlSpec);
            scope.hoverFocus = !scope.thumbnail;
          }, HOVER_TIMEOUT);
        };

        scope.mouseout = function() {
          if (scope.hoverFocus) {
            Logger.logInteraction(Logger.actions.CHART_MOUSEOUT, '', scope.chart.vlSpec);
          }

          $timeout.cancel(scope.hoverPromise);
          scope.hoverFocus = scope.unlocked = false;
        };

        function viewOnMouseOver(event, item) {
          if (!item || !item.datum) { return; }

          scope.tooltipPromise = $timeout(function activateTooltip(){
            scope.tooltipActive = true;
            Logger.logInteraction(Logger.actions.CHART_TOOLTIP, item.datum);

            // convert data into a format that we can easily use with ng table and ng-repeat
            // TODO: revise if this is actually a good idea
            scope.data = _(item.datum).omit('_prev', '_id') // omit vega internals
              .pairs().value()
              .map(function(p) {
                p[1] = dl.isNumber(p[1]) ? format(p[1]) : p[1];
                return p;
              });
            scope.$digest();

            var tooltip = element.find('.vis-tooltip'),
              $body = angular.element($document),
              width = tooltip.width(),
              height= tooltip.height();

            // put tooltip above if it's near the screen's bottom border
            if (event.pageY+10+height < $body.height()) {
              tooltip.css('top', (event.pageY+10));
            } else {
              tooltip.css('top', (event.pageY-10-height));
            }

            // put tooltip on left if it's near the screen's right border
            if (event.pageX+10+ width < $body.width()) {
              tooltip.css('left', (event.pageX+10));
            } else {
              tooltip.css('left', (event.pageX-10-width));
            }
          }, TOOLTIP_TIMEOUT);
        }

        function viewOnMouseOut(event, item) {
          //clear positions
          var tooltip = element.find('.vis-tooltip');
          tooltip.css('top', null);
          tooltip.css('left', null);
          $timeout.cancel(scope.tooltipPromise);
          if (scope.tooltipActive) {
            Logger.logInteraction(Logger.actions.CHART_TOOLTIP_END, item.datum);
          }
          scope.tooltipActive = false;
          scope.data = [];
          scope.$digest();
        }

        function getVgSpec() {
          var configSet = scope.configSet || consts.defaultConfigSet || {};

          if (!scope.chart.vlSpec) return;

          var vlSpec = _.cloneDeep(scope.chart.vlSpec);
          vl.extend(vlSpec.config, Config[configSet]());

          // use chart stats if available (for example from bookmarks)
          var stats = scope.chart.stats || Dataset.stats;

          return vl.compile(vlSpec, stats);
        }

        function rescaleIfEnable() {
          if (scope.rescale) {
            var xRatio = scope.maxWidth > 0 ?  scope.maxWidth / scope.width : 1;
            var yRatio = scope.maxHeight > 0 ? scope.maxHeight / scope.height  : 1;
            var ratio = Math.min(xRatio, yRatio);

            var niceRatio = 1;
            while (0.75 * niceRatio> ratio) {
              niceRatio /= 2;
            }

            var t = niceRatio * 100 / 2 && 0;
            element.find('.vega').css('transform', 'translate(-'+t+'%, -'+t+'%) scale('+niceRatio+')');
          } else {
            element.find('.vega').css('transform', null);
          }
        }

        function getShorthand() {
          return scope.chart.shorthand || (scope.chart.vlSpec ? vl.Encoding.shorthand(scope.chart.vlSpec) : '');
        }

        function renderQueueNext() {
          // render next item in the queue
          if (renderQueue.size() > 0) {
            var next = renderQueue.pop();
            next.parse();
          } else {
            // or say that no one is rendering
            rendering = false;
          }
        }

        function render(spec) {
          if (!spec) {
            if (view) {
              view.off('mouseover');
              view.off('mouseout');
            }
            return;
          }

          scope.height = spec.height;
          if (!element) {
            console.error('can not find vis element');
          }

          var shorthand = getShorthand();

          scope.renderer = getRenderer(spec);

          function parseVega() {
            // if no longer a part of the list, cancel!
            if (scope.destroyed || scope.disabled || (scope.isInList && scope.chart.fieldSetKey && !scope.isInList(scope.chart.fieldSetKey))) {
              console.log('cancel rendering', shorthand);
              renderQueueNext();
              return;
            }

            var start = new Date().getTime();
            // render if still a part of the list
            vg.parse.spec(spec, function(chart) {
              try {
                var endParse = new Date().getTime();
                view = null;
                view = chart({el: element[0]});

                if (!consts.useUrl) {
                  view.data({raw: Dataset.data});
                }

                scope.width =  view.width();
                scope.height = view.height();
                view.renderer(getRenderer(spec.width, scope.height));
                view.update();

                if (consts.debug) {
                  $window.views = $window.views || {};
                  $window.views[shorthand] = view;
                }

                Logger.logInteraction(Logger.actions.CHART_RENDER, '', scope.chart.vlSpec);
                  rescaleIfEnable();

                var endChart = new Date().getTime();
                console.log('parse spec', (endParse-start), 'charting', (endChart-endParse), shorthand);
                if (scope.tooltip) {
                  view.on('mouseover', viewOnMouseOver);
                  view.on('mouseout', viewOnMouseOut);
                }
              } catch (e) {
                console.error(e);
              } finally {
                renderQueueNext();
              }

            });
          }

          if (!rendering) { // if no instance is being render -- rendering now
            rendering=true;
            parseVega();
          } else {
            // otherwise queue it
            renderQueue.push({
              priority: scope.priority || 0,
              parse: parseVega
            });
          }
        }

        var view;
        scope.$watch(function() {
          // Omit data property to speed up deep watch
          return _.omit(scope.chart.vlSpec, 'data');
        }, function() {
          var spec = scope.chart.vgSpec = getVgSpec();
          if (!scope.chart.cleanSpec) {
            scope.chart.cleanSpec = vl.Encoding.fromSpec(scope.chart.vlSpec).toSpec(true);
          }
          render(spec);
        }, true);

        scope.$on('$destroy', function() {
          console.log('vlplot destroyed');
          if (view) {
            view.off('mouseover');
            view.off('mouseout');
            view = null;
          }
          var shorthand = getShorthand();
          if (consts.debug && $window.views) {
            delete $window.views[shorthand];
          }

          scope.destroyed = true;
          // FIXME another way that should eliminate things from memory faster should be removing
          // maybe something like
          // renderQueue.splice(renderQueue.indexOf(parseVega), 1));
          // but without proper testing, this is riskier than setting scope.destroyed.
        });
      }
    };
  }]);
}());

;(function() {
'use strict';

/**
 * @ngdoc directive
 * @name vega-lite-ui.directive:visListItem
 * @description
 * # visListItem
 */
angular.module('vlui')
  .directive('vlPlotGroup', ['Bookmarks', 'consts', 'dl', 'vl', 'Dataset', 'Logger', '_', function (Bookmarks, consts, dl, vl, Dataset, Logger, _) {
    return {
      templateUrl: 'vlplotgroup/vlplotgroup.html',
      restrict: 'E',
      replace: true,
      controller: ['$scope', '$element', function($scope, $element) {
        this.getDropTarget = function() {
          return $element.find('.fa-wrench')[0];
        };
      }],
      scope: {
        /* pass to vlplot **/
        chart: '=',

        //optional
        disabled: '=',
        isInList: '=',

        alwaysScrollable: '=',
        configSet: '@',
        maxHeight: '=',
        maxWidth: '=',
        overflow: '=',
        priority: '=',
        rescale: '=',
        thumbnail: '=',
        tooltip: '=',

        /* vlplotgroup specific */

        fieldSet: '=',

        showBookmark: '@',
        showDebug: '=',
        showExpand: '=',
        showFilterNull: '@',
        showLabel: '@',
        showLog: '@',
        showMarkType: '@',
        showSort: '@',
        showTranspose: '@',

        alwaysSelected: '=',
        isSelected: '=',
        highlighted: '=',
        expandAction: '&',
      },
      link: function postLink(scope) {
        scope.Bookmarks = Bookmarks;
        scope.consts = consts;
        scope.Dataset = Dataset;

        // Defer rendering the debug Drop popup until it is requested
        scope.renderPopup = false;
        // Use _.once because the popup only needs to be initialized once
        scope.initializePopup = _.once(function() {
          scope.renderPopup = true;
        });

        scope.logCode = function(name, value) {
          console.log(name+':\n\n', JSON.stringify(value));
        };

        // TOGGLE LOG

        scope.log = {};
        scope.log.support = function(spec, encType) {
          if (!spec) { return false; }
          var encoding = spec.encoding,
            field = encoding[encType];

          return field && field.type ==='Q' && !field.bin;
        };

        scope.log.toggle = function(spec, encType) {
          if (!scope.log.support(spec, encType)) { return; }

          var field = spec.encoding[encType],
            scale = field.scale = field.scale || {};

          scale.type = scale.type === 'log' ? 'linear' : 'log';
          Logger.logInteraction(Logger.actions.LOG_TOGGLE, scope.chart.shorthand);
        };
        scope.log.active = function(spec, encType) {
          if (!scope.log.support(spec, encType)) { return; }

          var field = spec.encoding[encType],
            scale = field.scale = field.scale || {};

          return scale.type === 'log';
        };

        // TOGGLE FILTER
        // TODO: extract toggleFilterNull to be its own class

        scope.toggleFilterNull = function(spec) {
          Logger.logInteraction(Logger.actions.NULL_FILTER_TOGGLE, scope.chart.shorthand);

          spec.config = spec.config || {};
          spec.config.filterNull = spec.config.filterNull || {
            // TODO: initiate this from filterNull's schema instead
            N: false,
            O: false,
            T: true,
            Q: true
          };
          spec.config.filterNull.O = !spec.config.filterNull.O;
          spec.config.filterNull.N = !spec.config.filterNull.N;
        };

        scope.toggleFilterNull.support = function(spec, stats) {
          var fields = vl.enc.fields(spec.encoding);
          for (var fieldName in fields) {
            var fieldList = fields[fieldName];
            if (
                (fieldList.containsType.O || fieldList.containsType.N) &&
                (fieldName in stats) &&
                stats[fieldName].missing > 0
              ) {
              return true;
            }
          }
          return false;
        };

        // TOGGLE SORT
        // TODO: extract toggleSort to be its own class

        var toggleSort = scope.toggleSort = {};

        toggleSort.modes = ['ordinal-ascending', 'ordinal-descending',
          'quantitative-ascending', 'quantitative-descending', 'custom'];

        toggleSort.toggle = function(spec) {
          Logger.logInteraction(Logger.actions.SORT_TOGGLE, scope.chart.shorthand);
          var currentMode = toggleSort.mode(spec);
          var currentModeIndex = toggleSort.modes.indexOf(currentMode);

          var newModeIndex = (currentModeIndex + 1) % (toggleSort.modes.length - 1);
          var newMode = toggleSort.modes[newModeIndex];

          console.log('toggleSort', currentMode, newMode);

          var channels = toggleSort.channels(spec);
          spec.encoding[channels.ordinal].sort = toggleSort.getSort(newMode, spec);
        };

        /** Get sort property definition that matches each mode. */
        toggleSort.getSort = function(mode, spec) {
          if (mode === 'ordinal-ascending') {
            return 'ascending';
          }

          if (mode === 'ordinal-descending') {
            return 'descending';
          }

          var channels = toggleSort.channels(spec);
          var qEncDef = spec.encoding[channels.quantitative];

          if (mode === 'quantitative-ascending') {
            return {
              op: qEncDef.aggregate,
              field: qEncDef.name,
              order: 'ascending'
            };
          }

          if (mode === 'quantitative-descending') {
            return {
              op: qEncDef.aggregate,
              field: qEncDef.name,
              order: 'descending'
            };
          }

          return null;
        };

        toggleSort.mode = function(spec) {
          var channels = toggleSort.channels(spec);
          var sort = spec.encoding[channels.ordinal].sort;

          if (sort === undefined) {
            return 'ordinal-ascending';
          }

          for (var i = 0; i < toggleSort.modes.length - 1 ; i++) {
            // check if sort matches any of the sort for each mode except 'custom'.
            var mode = toggleSort.modes[i];
            var sortOfMode = toggleSort.getSort(mode, spec);

            if (_.isEqual(sort, sortOfMode)) {
              return mode;
            }
          }

          if (dl.isObject(sort) && sort.op && sort.field) {
            return 'custom';
          }
          console.error('invalid mode');
          return null;
        };

        toggleSort.channels = function(spec) {
          return spec.encoding.x.type === 'N' || spec.encoding.x.type === 'O' ?
                  {ordinal: 'x', quantitative: 'y'} :
                  {ordinal: 'y', quantitative: 'x'};
        };

        toggleSort.support = function(spec, stats) {
          var enc = spec.encoding;

          if (vl.enc.has(enc, 'row') || vl.enc.has(enc, 'col') ||
            !vl.enc.has(enc, 'x') || !vl.enc.has(enc, 'y') ||
            !vl.Encoding.alwaysNoOcclusion(spec, stats)) {
            return false;
          }

          return ( vl.encDef.isTypes(enc.x, ['N', 'O']) && vl.encDef.isMeasure(enc.y)) ? 'x' :
            ( vl.encDef.isTypes(enc.y, ['N','O']) && vl.encDef.isMeasure(enc.x)) ? 'y' : false;
        };

        scope.toggleSortClass = function(vlSpec) {
          if (!vlSpec || !toggleSort.support(vlSpec, Dataset.stats)) {
            return 'invisible';
          }

          var ordinalChannel = vlSpec && toggleSort.channels(vlSpec).ordinal,
            mode = vlSpec && toggleSort.mode(vlSpec);

          var directionClass = ordinalChannel === 'x' ? 'sort-x ' : '';

          switch (mode) {
            case 'ordinal-ascending':
              return directionClass + 'fa-sort-alpha-asc';
            case 'ordinal-descending':
              return directionClass + 'fa-sort-alpha-desc';
            case 'quantitative-ascending':
              return directionClass + 'fa-sort-amount-asc';
            case 'quantitative-descending':
              return directionClass + 'fa-sort-amount-desc';
            default: // custom
              return directionClass + 'fa-sort';
          }
        };

        scope.transpose = function() {
          Logger.logInteraction(Logger.actions.TRANSPOSE_TOGGLE, scope.chart.shorthand);
          vl.Encoding.transpose(scope.chart.vlSpec);
        };

        scope.$on('$destroy', function() {
          scope.chart = null;
        });
      }
    };
  }]);
}());

;(function() {
'use strict';

/**
 * @ngdoc directive
 * @name vega-lite-ui.directive:visListItem
 * @description
 * # visListItem
 */
angular.module('vlui')
  .directive('vlPlotGroupPopup', ['Drop', function (Drop) {
    return {
      templateUrl: 'vlplotgroup/vlplotgrouppopup.html',
      restrict: 'E',
      require: '^^vlPlotGroup',
      scope: false,
      link: function postLink(scope, element, attrs, vlPlotGroupController) {
        var debugPopup = new Drop({
          content: element.find('.dev-tool')[0],
          target: vlPlotGroupController.getDropTarget(),
          position: 'bottom right',
          openOn: 'click',
          constrainToWindow: true
        });

        scope.$on('$destroy', function() {
          debugPopup.destroy();
        });
      }
    };
  }]);
}());

;(function() {
'use strict';

angular.module('vlui')
  .filter('compactJSON', ['JSON3', function(JSON3) {
    return function(input) {
      return JSON3.stringify(input, null, '  ', 80);
    };
  }]);
}());

;(function() {
'use strict';

/**
 * @ngdoc filter
 * @name facetedviz.filter:reportUrl
 * @function
 * @description
 * # reportUrl
 * Filter in the facetedviz.
 */
angular.module('vlui')
  .filter('reportUrl', ['compactJSONFilter', '_', 'consts', function (compactJSONFilter, _, consts) {
    function voyagerReport(params) {
      var url = 'https://docs.google.com/forms/d/1T9ZA14F3mmzrHR7JJVUKyPXzrMqF54CjLIOjv2E7ZEM/viewform?';

      if (params.fields) {
        var query = encodeURI(compactJSONFilter(_.values(params.fields)));
        url += 'entry.1245199477=' + query + '&';
      }

      if (params.encoding) {
        var encoding = _.omit(params.encoding, 'config');
        encoding = encodeURI(compactJSONFilter(encoding));
        url += 'entry.1323680136=' + encoding + '&';
      }

      if (params.encoding2) {
        var encoding2 = _.omit(params.encoding2, 'config');
        encoding2 = encodeURI(compactJSONFilter(encoding2));
        url += 'entry.853137786=' + encoding2 + '&';
      }

      var typeProp = 'entry.1940292677=';
      switch (params.type) {
        case 'vl':
          url += typeProp + 'Visualization+Rendering+(Vegalite)&';
          break;
        case 'vr':
          url += typeProp + 'Recommender+Algorithm+(Visrec)&';
          break;
        case 'fv':
          url += typeProp + 'Recommender+UI+(FacetedViz)&';
          break;

      }
      return url;
    }

    function vluiReport(params) {
      var url = 'https://docs.google.com/forms/d/1xKs-qGaLZEUfbTmhdmSoS13OKOEpuu_NNWE5TAAml_Y/viewform?';
      if (params.encoding) {
        var encoding = _.omit(params.encoding, 'config');
        encoding = encodeURI(compactJSONFilter(encoding));
        url += 'entry.1245199477=' + encoding + '&';
      }
      return url;
    }

    return consts.appId === 'voyager' ? voyagerReport : vluiReport;
  }]);
}());

;(function() {
'use strict';

/**
 * @ngdoc filter
 * @name vega-lite-ui.filter:encodeUri
 * @function
 * @description
 * # encodeUri
 * Filter in the vega-lite-ui.
 */
angular.module('vlui')
  .filter('encodeURI', function () {
    return function (input) {
      return window.encodeURI(input);
    };
  });
}());

;(function() {
'use strict';

angular.module('vlui')
  .filter('scaleType', function() {
    return function(input) {
      var scaleTypes = {
        Q: 'Quantitative',
        N: 'Nominal',
        O: 'Ordinal',
        T: 'Time'
      };

      return scaleTypes[input];
    };
  });
}());

;(function() {
'use strict';

/**
 * @ngdoc filter
 * @name vega-lite-ui.filter:underscore2space
 * @function
 * @description
 * # underscore2space
 * Filter in the vega-lite-ui.
 */
angular.module('vlui')
  .filter('underscore2space', function () {
    return function (input) {
      return input ? input.replace(/_+/g, ' ') : '';
    };
  });
}());

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImpzb24zLWNvbXBhY3RzdHJpbmdpZnkuanMiLCJpbmRleC5qcyIsInRlbXBsYXRlQ2FjaGVIdG1sLmpzIiwiYWxlcnRtZXNzYWdlcy9hbGVydG1lc3NhZ2VzLmpzIiwiYWxlcnRzL2FsZXJ0cy5zZXJ2aWNlLmpzIiwiYm9va21hcmtzL2Jvb2ttYXJrcy5zZXJ2aWNlLmpzIiwiYm9va21hcmtsaXN0L2Jvb2ttYXJrbGlzdC5qcyIsImNvbmZpZy9jb25maWcuc2VydmljZS5qcyIsImRhdGFzZXQvYWRkbXlyaWFkYXRhc2V0LmpzIiwiZGF0YXNldC9hZGR1cmxkYXRhc2V0LmpzIiwiZGF0YXNldC9jaGFuZ2Vsb2FkZWRkYXRhc2V0LmpzIiwiZGF0YXNldC9kYXRhc2V0LnNlcnZpY2UuanMiLCJkYXRhc2V0L2RhdGFzZXRtb2RhbC5qcyIsImRhdGFzZXQvZGF0YXNldHNlbGVjdG9yLmpzIiwiZGF0YXNldC9maWxlZHJvcHpvbmUuanMiLCJkYXRhc2V0L3Bhc3RlZGF0YXNldC5qcyIsImRhdGFzZXQvc2FtcGxlZGF0YS5qcyIsImZpZWxkaW5mby9maWVsZGluZm8uanMiLCJsb2dnZXIvbG9nZ2VyLnNlcnZpY2UuanMiLCJtb2RhbC9tb2RhbC5qcyIsIm1vZGFsL21vZGFsY2xvc2VidXR0b24uanMiLCJtb2RhbC9tb2RhbHMuc2VydmljZS5qcyIsInRhYnMvdGFiLmpzIiwidGFicy90YWJzZXQuanMiLCJ2bHBsb3QvdmxwbG90LmpzIiwidmxwbG90Z3JvdXAvdmxwbG90Z3JvdXAuanMiLCJ2bHBsb3Rncm91cC92bHBsb3Rncm91cHBvcHVwLmpzIiwiZmlsdGVycy9jb21wYWN0anNvbi9jb21wYWN0anNvbi5maWx0ZXIuanMiLCJmaWx0ZXJzL3JlcG9ydHVybC9yZXBvcnR1cmwuZmlsdGVyLmpzIiwiZmlsdGVycy9lbmNvZGV1cmkvZW5jb2RldXJpLmZpbHRlci5qcyIsImZpbHRlcnMvc2NhbGV0eXBlL3NjYWxldHlwZS5maWx0ZXIuanMiLCJmaWx0ZXJzL3VuZGVyc2NvcmUyc3BhY2UvdW5kZXJzY29yZTJzcGFjZS5maWx0ZXIuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7O0FBS0EsQ0FBQyxDQUFDLFlBQVk7OztFQUdaLElBQUksV0FBVyxPQUFPLFdBQVcsY0FBYyxPQUFPOzs7RUFHdEQsSUFBSSxjQUFjO0lBQ2hCLFlBQVk7SUFDWixVQUFVOzs7O0VBSVosSUFBSSxjQUFjLFlBQVksT0FBTyxZQUFZLFdBQVcsQ0FBQyxRQUFRLFlBQVk7Ozs7OztFQU1qRixJQUFJLE9BQU8sWUFBWSxPQUFPLFdBQVcsVUFBVTtNQUMvQyxhQUFhLGVBQWUsWUFBWSxPQUFPLFdBQVcsVUFBVSxDQUFDLE9BQU8sWUFBWSxPQUFPLFVBQVUsWUFBWTs7RUFFekgsSUFBSSxlQUFlLFdBQVcsY0FBYyxjQUFjLFdBQVcsY0FBYyxjQUFjLFdBQVcsWUFBWSxhQUFhO0lBQ25JLE9BQU87Ozs7O0VBS1QsU0FBUyxhQUFhLFNBQVMsU0FBUztJQUN0QyxZQUFZLFVBQVUsS0FBSztJQUMzQixZQUFZLFVBQVUsS0FBSzs7O0lBRzNCLElBQUksU0FBUyxRQUFRLGFBQWEsS0FBSztRQUNuQyxTQUFTLFFBQVEsYUFBYSxLQUFLO1FBQ25DLFNBQVMsUUFBUSxhQUFhLEtBQUs7UUFDbkMsT0FBTyxRQUFRLFdBQVcsS0FBSztRQUMvQixjQUFjLFFBQVEsa0JBQWtCLEtBQUs7UUFDN0MsWUFBWSxRQUFRLGdCQUFnQixLQUFLO1FBQ3pDLE9BQU8sUUFBUSxXQUFXLEtBQUs7UUFDL0IsYUFBYSxRQUFRLFdBQVcsS0FBSzs7O0lBR3pDLElBQUksT0FBTyxjQUFjLFlBQVksWUFBWTtNQUMvQyxRQUFRLFlBQVksV0FBVztNQUMvQixRQUFRLFFBQVEsV0FBVzs7OztJQUk3QixJQUFJLGNBQWMsT0FBTztRQUNyQixXQUFXLFlBQVk7UUFDdkIsWUFBWSxTQUFTOzs7SUFHekIsSUFBSSxhQUFhLElBQUksS0FBSyxDQUFDO0lBQzNCLElBQUk7OztNQUdGLGFBQWEsV0FBVyxvQkFBb0IsQ0FBQyxVQUFVLFdBQVcsa0JBQWtCLEtBQUssV0FBVyxpQkFBaUI7Ozs7UUFJbkgsV0FBVyxpQkFBaUIsTUFBTSxXQUFXLG1CQUFtQixNQUFNLFdBQVcsbUJBQW1CLEtBQUssV0FBVyx3QkFBd0I7TUFDOUksT0FBTyxXQUFXOzs7O0lBSXBCLFNBQVMsSUFBSSxNQUFNO01BQ2pCLElBQUksSUFBSSxVQUFVLE9BQU87O1FBRXZCLE9BQU8sSUFBSTs7TUFFYixJQUFJO01BQ0osSUFBSSxRQUFRLHlCQUF5Qjs7O1FBR25DLGNBQWMsSUFBSSxNQUFNO2FBQ25CLElBQUksUUFBUSxRQUFROzs7UUFHekIsY0FBYyxJQUFJLHFCQUFxQixJQUFJO2FBQ3RDO1FBQ0wsSUFBSSxPQUFPLGFBQWE7O1FBRXhCLElBQUksUUFBUSxrQkFBa0I7VUFDNUIsSUFBSSxZQUFZLFFBQVEsV0FBVyxxQkFBcUIsT0FBTyxhQUFhLGNBQWM7VUFDMUYsSUFBSSxvQkFBb0I7O1lBRXRCLENBQUMsUUFBUSxZQUFZO2NBQ25CLE9BQU87ZUFDTixTQUFTO1lBQ1osSUFBSTtjQUNGOzs7Z0JBR0UsVUFBVSxPQUFPOzs7Z0JBR2pCLFVBQVUsSUFBSSxjQUFjO2dCQUM1QixVQUFVLElBQUksYUFBYTs7Ozs7Z0JBSzNCLFVBQVUsY0FBYzs7O2dCQUd4QixVQUFVLFdBQVc7OztnQkFHckIsZ0JBQWdCOzs7Ozs7Z0JBTWhCLFVBQVUsV0FBVztnQkFDckIsVUFBVSxDQUFDLFdBQVc7OztnQkFHdEIsVUFBVSxDQUFDLFdBQVc7O2dCQUV0QixVQUFVLFNBQVM7Ozs7O2dCQUtuQixVQUFVLENBQUMsT0FBTyxVQUFVLFVBQVU7OztnQkFHdEMsVUFBVSxFQUFFLEtBQUssQ0FBQyxPQUFPLE1BQU0sT0FBTyxNQUFNLHdCQUF3Qjs7Z0JBRXBFLFVBQVUsTUFBTSxXQUFXO2dCQUMzQixVQUFVLENBQUMsR0FBRyxJQUFJLE1BQU0sTUFBTTs7O2dCQUc5QixVQUFVLElBQUksS0FBSyxDQUFDLGFBQWE7O2dCQUVqQyxVQUFVLElBQUksS0FBSyxhQUFhOzs7Z0JBR2hDLFVBQVUsSUFBSSxLQUFLLENBQUMsaUJBQWlCOzs7Z0JBR3JDLFVBQVUsSUFBSSxLQUFLLENBQUMsT0FBTztjQUM3QixPQUFPLFdBQVc7Y0FDbEIscUJBQXFCOzs7VUFHekIsY0FBYzs7O1FBR2hCLElBQUksUUFBUSxjQUFjO1VBQ3hCLElBQUksUUFBUSxRQUFRO1VBQ3BCLElBQUksT0FBTyxTQUFTLFlBQVk7WUFDOUIsSUFBSTs7OztjQUlGLElBQUksTUFBTSxTQUFTLEtBQUssQ0FBQyxNQUFNLFFBQVE7O2dCQUVyQyxRQUFRLE1BQU07Z0JBQ2QsSUFBSSxpQkFBaUIsTUFBTSxLQUFLLFVBQVUsS0FBSyxNQUFNLEtBQUssT0FBTztnQkFDakUsSUFBSSxnQkFBZ0I7a0JBQ2xCLElBQUk7O29CQUVGLGlCQUFpQixDQUFDLE1BQU07b0JBQ3hCLE9BQU8sV0FBVztrQkFDcEIsSUFBSSxnQkFBZ0I7b0JBQ2xCLElBQUk7Ozs7c0JBSUYsaUJBQWlCLE1BQU0sVUFBVTtzQkFDakMsT0FBTyxXQUFXOztrQkFFdEIsSUFBSSxnQkFBZ0I7b0JBQ2xCLElBQUk7Ozs7c0JBSUYsaUJBQWlCLE1BQU0sVUFBVTtzQkFDakMsT0FBTyxXQUFXOzs7O2NBSTFCLE9BQU8sV0FBVztjQUNsQixpQkFBaUI7OztVQUdyQixjQUFjOzs7TUFHbEIsT0FBTyxJQUFJLFFBQVEsQ0FBQyxDQUFDOzs7SUFHdkIsSUFBSSxNQUFNOztNQUVSLElBQUksZ0JBQWdCO1VBQ2hCLFlBQVk7VUFDWixjQUFjO1VBQ2QsY0FBYztVQUNkLGFBQWE7VUFDYixlQUFlOzs7TUFHbkIsSUFBSSxpQkFBaUIsSUFBSTs7O01BR3pCLElBQUksQ0FBQyxZQUFZO1FBQ2YsSUFBSSxRQUFRLEtBQUs7OztRQUdqQixJQUFJLFNBQVMsQ0FBQyxHQUFHLElBQUksSUFBSSxJQUFJLEtBQUssS0FBSyxLQUFLLEtBQUssS0FBSyxLQUFLLEtBQUs7OztRQUdoRSxJQUFJLFNBQVMsVUFBVSxNQUFNLE9BQU87VUFDbEMsT0FBTyxPQUFPLFNBQVMsT0FBTyxPQUFPLFFBQVEsTUFBTSxDQUFDLE9BQU8sUUFBUSxRQUFRLEVBQUUsUUFBUSxPQUFPLEtBQUssTUFBTSxDQUFDLE9BQU8sT0FBTyxTQUFTLE9BQU8sTUFBTSxDQUFDLE9BQU8sT0FBTyxTQUFTOzs7Ozs7TUFNeEssSUFBSSxFQUFFLGFBQWEsWUFBWSxpQkFBaUI7UUFDOUMsYUFBYSxVQUFVLFVBQVU7VUFDL0IsSUFBSSxVQUFVLElBQUk7VUFDbEIsSUFBSSxDQUFDLFFBQVEsWUFBWSxNQUFNLFFBQVEsWUFBWTs7O1lBR2pELFlBQVk7YUFDWCxTQUFTLFlBQVksVUFBVTs7O1lBR2hDLGFBQWEsVUFBVSxVQUFVOzs7O2NBSS9CLElBQUksV0FBVyxLQUFLLFdBQVcsU0FBUyxhQUFhLEtBQUssWUFBWSxNQUFNOztjQUU1RSxLQUFLLFlBQVk7Y0FDakIsT0FBTzs7aUJBRUo7O1lBRUwsY0FBYyxRQUFROzs7WUFHdEIsYUFBYSxVQUFVLFVBQVU7Y0FDL0IsSUFBSSxTQUFTLENBQUMsS0FBSyxlQUFlLGFBQWE7Y0FDL0MsT0FBTyxZQUFZLFFBQVEsRUFBRSxZQUFZLFVBQVUsS0FBSyxjQUFjLE9BQU87OztVQUdqRixVQUFVO1VBQ1YsT0FBTyxXQUFXLEtBQUssTUFBTTs7Ozs7O01BTWpDLFVBQVUsVUFBVSxRQUFRLFVBQVU7UUFDcEMsSUFBSSxPQUFPLEdBQUcsWUFBWSxTQUFTOzs7OztRQUtuQyxDQUFDLGFBQWEsWUFBWTtVQUN4QixLQUFLLFVBQVU7V0FDZCxVQUFVLFVBQVU7OztRQUd2QixVQUFVLElBQUk7UUFDZCxLQUFLLFlBQVksU0FBUzs7VUFFeEIsSUFBSSxXQUFXLEtBQUssU0FBUyxXQUFXO1lBQ3RDOzs7UUFHSixhQUFhLFVBQVU7OztRQUd2QixJQUFJLENBQUMsTUFBTTs7VUFFVCxVQUFVLENBQUMsV0FBVyxZQUFZLGtCQUFrQix3QkFBd0IsaUJBQWlCLGtCQUFrQjs7O1VBRy9HLFVBQVUsVUFBVSxRQUFRLFVBQVU7WUFDcEMsSUFBSSxhQUFhLFNBQVMsS0FBSyxXQUFXLGVBQWUsVUFBVTtZQUNuRSxJQUFJLGNBQWMsQ0FBQyxjQUFjLE9BQU8sT0FBTyxlQUFlLGNBQWMsWUFBWSxPQUFPLE9BQU8sbUJBQW1CLE9BQU8sa0JBQWtCO1lBQ2xKLEtBQUssWUFBWSxRQUFROzs7Y0FHdkIsSUFBSSxFQUFFLGNBQWMsWUFBWSxnQkFBZ0IsWUFBWSxLQUFLLFFBQVEsV0FBVztnQkFDbEYsU0FBUzs7OztZQUliLEtBQUssU0FBUyxRQUFRLFFBQVEsV0FBVyxRQUFRLEVBQUUsU0FBUyxZQUFZLEtBQUssUUFBUSxhQUFhLFNBQVMsVUFBVTs7ZUFFbEgsSUFBSSxRQUFRLEdBQUc7O1VBRXBCLFVBQVUsVUFBVSxRQUFRLFVBQVU7O1lBRXBDLElBQUksVUFBVSxJQUFJLGFBQWEsU0FBUyxLQUFLLFdBQVcsZUFBZTtZQUN2RSxLQUFLLFlBQVksUUFBUTs7OztjQUl2QixJQUFJLEVBQUUsY0FBYyxZQUFZLGdCQUFnQixDQUFDLFdBQVcsS0FBSyxTQUFTLGNBQWMsUUFBUSxZQUFZLE1BQU0sV0FBVyxLQUFLLFFBQVEsV0FBVztnQkFDbkosU0FBUzs7OztlQUlWOztVQUVMLFVBQVUsVUFBVSxRQUFRLFVBQVU7WUFDcEMsSUFBSSxhQUFhLFNBQVMsS0FBSyxXQUFXLGVBQWUsVUFBVTtZQUNuRSxLQUFLLFlBQVksUUFBUTtjQUN2QixJQUFJLEVBQUUsY0FBYyxZQUFZLGdCQUFnQixXQUFXLEtBQUssUUFBUSxhQUFhLEVBQUUsZ0JBQWdCLGFBQWEsZ0JBQWdCO2dCQUNsSSxTQUFTOzs7OztZQUtiLElBQUksaUJBQWlCLFdBQVcsS0FBSyxTQUFTLFdBQVcsaUJBQWlCO2NBQ3hFLFNBQVM7Ozs7UUFJZixPQUFPLFFBQVEsUUFBUTs7Ozs7Ozs7O01BU3pCLElBQUksTUFBTTs7UUFFUixJQUFJLFVBQVU7VUFDWixJQUFJO1VBQ0osSUFBSTtVQUNKLEdBQUc7VUFDSCxJQUFJO1VBQ0osSUFBSTtVQUNKLElBQUk7VUFDSixHQUFHOzs7OztRQUtMLElBQUksZ0JBQWdCO1FBQ3BCLElBQUksaUJBQWlCLFVBQVUsT0FBTyxPQUFPOzs7VUFHM0MsT0FBTyxDQUFDLGlCQUFpQixTQUFTLElBQUksTUFBTSxDQUFDOzs7Ozs7O1FBTy9DLElBQUksZ0JBQWdCO1FBQ3BCLElBQUksUUFBUSxVQUFVLE9BQU87VUFDM0IsSUFBSSxTQUFTLEtBQUssUUFBUSxHQUFHLFNBQVMsTUFBTSxRQUFRLGVBQWUsQ0FBQyxrQkFBa0IsU0FBUztVQUMvRixJQUFJLFVBQVUsaUJBQWlCLGlCQUFpQixNQUFNLE1BQU0sTUFBTTtVQUNsRSxPQUFPLFFBQVEsUUFBUSxTQUFTO1lBQzlCLElBQUksV0FBVyxNQUFNLFdBQVc7OztZQUdoQyxRQUFRO2NBQ04sS0FBSyxHQUFHLEtBQUssR0FBRyxLQUFLLElBQUksS0FBSyxJQUFJLEtBQUssSUFBSSxLQUFLLElBQUksS0FBSztnQkFDdkQsVUFBVSxRQUFRO2dCQUNsQjtjQUNGO2dCQUNFLElBQUksV0FBVyxJQUFJO2tCQUNqQixVQUFVLGdCQUFnQixlQUFlLEdBQUcsU0FBUyxTQUFTO2tCQUM5RDs7Z0JBRUYsVUFBVSxlQUFlLFFBQVEsU0FBUyxNQUFNLE9BQU87OztVQUc3RCxPQUFPLFNBQVM7Ozs7O1FBS2xCLElBQUksWUFBWSxVQUFVLFVBQVUsUUFBUSxVQUFVLFlBQVksWUFBWSxhQUFhLE9BQU8sZUFBZTtVQUMvRyxJQUFJLE9BQU8sV0FBVyxNQUFNLE9BQU8sTUFBTSxNQUFNLE9BQU8sU0FBUyxTQUFTLGNBQWMsU0FBUyxTQUFTLE9BQU8sUUFBUSxRQUFROztVQUUvSCxnQkFBZ0IsaUJBQWlCOztVQUVqQyxJQUFJOztZQUVGLFFBQVEsT0FBTztZQUNmLE9BQU8sV0FBVztVQUNwQixJQUFJLE9BQU8sU0FBUyxZQUFZLE9BQU87WUFDckMsWUFBWSxTQUFTLEtBQUs7WUFDMUIsSUFBSSxhQUFhLGFBQWEsQ0FBQyxXQUFXLEtBQUssT0FBTyxXQUFXO2NBQy9ELElBQUksUUFBUSxDQUFDLElBQUksS0FBSyxRQUFRLElBQUksR0FBRzs7OztnQkFJbkMsSUFBSSxRQUFROzs7O2tCQUlWLE9BQU8sTUFBTSxRQUFRO2tCQUNyQixLQUFLLE9BQU8sTUFBTSxPQUFPLFlBQVksT0FBTyxHQUFHLE9BQU8sT0FBTyxHQUFHLE1BQU0sTUFBTSxPQUFPO2tCQUNuRixLQUFLLFFBQVEsTUFBTSxDQUFDLE9BQU8sT0FBTyxNQUFNLE1BQU0sUUFBUSxPQUFPLE1BQU0sUUFBUSxNQUFNLE1BQU0sUUFBUTtrQkFDL0YsT0FBTyxJQUFJLE9BQU8sT0FBTyxNQUFNOzs7OztrQkFLL0IsT0FBTyxDQUFDLFFBQVEsUUFBUSxTQUFTOzs7a0JBR2pDLFFBQVEsTUFBTSxPQUFPLFFBQVE7a0JBQzdCLFVBQVUsTUFBTSxPQUFPLE9BQU87a0JBQzlCLFVBQVUsTUFBTSxPQUFPLE9BQU87a0JBQzlCLGVBQWUsT0FBTzt1QkFDakI7a0JBQ0wsT0FBTyxNQUFNO2tCQUNiLFFBQVEsTUFBTTtrQkFDZCxPQUFPLE1BQU07a0JBQ2IsUUFBUSxNQUFNO2tCQUNkLFVBQVUsTUFBTTtrQkFDaEIsVUFBVSxNQUFNO2tCQUNoQixlQUFlLE1BQU07OztnQkFHdkIsUUFBUSxDQUFDLFFBQVEsS0FBSyxRQUFRLE1BQU0sQ0FBQyxPQUFPLElBQUksTUFBTSxPQUFPLGVBQWUsR0FBRyxPQUFPLElBQUksQ0FBQyxPQUFPLFFBQVEsZUFBZSxHQUFHO2tCQUMxSCxNQUFNLGVBQWUsR0FBRyxRQUFRLEtBQUssTUFBTSxlQUFlLEdBQUc7OztrQkFHN0QsTUFBTSxlQUFlLEdBQUcsU0FBUyxNQUFNLGVBQWUsR0FBRyxXQUFXLE1BQU0sZUFBZSxHQUFHOztrQkFFNUYsTUFBTSxlQUFlLEdBQUcsZ0JBQWdCO3FCQUNyQztnQkFDTCxRQUFROzttQkFFTCxJQUFJLE9BQU8sTUFBTSxVQUFVLGVBQWUsQ0FBQyxhQUFhLGVBQWUsYUFBYSxlQUFlLGFBQWEsZUFBZSxXQUFXLEtBQUssT0FBTyxZQUFZOzs7OztjQUt2SyxRQUFRLE1BQU0sT0FBTzs7O1VBR3pCLElBQUksVUFBVTs7O1lBR1osUUFBUSxTQUFTLEtBQUssUUFBUSxVQUFVOztVQUUxQyxJQUFJLFVBQVUsTUFBTTtZQUNsQixPQUFPOztVQUVULFlBQVksU0FBUyxLQUFLO1VBQzFCLElBQUksYUFBYSxjQUFjOztZQUU3QixPQUFPLEtBQUs7aUJBQ1AsSUFBSSxhQUFhLGFBQWE7OztZQUduQyxPQUFPLFFBQVEsQ0FBQyxJQUFJLEtBQUssUUFBUSxJQUFJLElBQUksS0FBSyxRQUFRO2lCQUNqRCxJQUFJLGFBQWEsYUFBYTs7WUFFbkMsT0FBTyxNQUFNLEtBQUs7OztVQUdwQixJQUFJLE9BQU8sU0FBUyxVQUFVOzs7WUFHNUIsS0FBSyxTQUFTLE1BQU0sUUFBUSxXQUFXO2NBQ3JDLElBQUksTUFBTSxZQUFZLE9BQU87O2dCQUUzQixNQUFNOzs7O1lBSVYsTUFBTSxLQUFLO1lBQ1gsVUFBVTs7WUFFVixTQUFTO1lBQ1QsZUFBZTtZQUNmLElBQUksYUFBYSxZQUFZO2NBQzNCLElBQUksY0FBYyxZQUFZLFFBQVE7O2NBRXRDLEtBQUssUUFBUSxHQUFHLFNBQVMsTUFBTSxRQUFRLFFBQVEsUUFBUSxTQUFTO2dCQUM5RCxVQUFVLFVBQVUsT0FBTyxPQUFPLFVBQVUsWUFBWSxZQUFZO2tCQUNsRSxPQUFPO2dCQUNULFNBQVMsWUFBWSxRQUFRLFNBQVM7Z0JBQ3RDLGVBQWUsT0FBTyxVQUFVLFFBQVEsSUFBSSxJQUFJO2dCQUNoRCxRQUFRLEtBQUs7O2NBRWYsU0FBUyxRQUFROztrQkFFYixlQUFlLGNBQWM7a0JBQzdCLFFBQVEsY0FBYyxRQUFRLEtBQUssUUFBUSxlQUFlLE9BQU8sU0FBUztrQkFDMUUsTUFBTSxRQUFRLEtBQUssT0FBTzs7a0JBRTFCO21CQUNDO2NBQ0wsSUFBSSxjQUFjLFlBQVksUUFBUSxNQUFNOzs7O2NBSTVDLFFBQVEsY0FBYyxPQUFPLFVBQVUsVUFBVTtnQkFDL0MsSUFBSSxRQUFRLFVBQVUsVUFBVSxVQUFVLE9BQU8sVUFBVSxZQUFZLFlBQVk7d0NBQzNELE9BQU87O2dCQUUvQixJQUFJLFlBQVksT0FBTzs7Ozs7OztrQkFPckIsU0FBUyxNQUFNLFlBQVksT0FBTyxhQUFhLE1BQU0sTUFBTTtrQkFDM0QsZUFBZSxPQUFPLFVBQVUsVUFBVSxJQUFJLElBQUk7a0JBQ2xELFFBQVEsS0FBSzs7O2NBR2pCLFNBQVMsUUFBUTs7a0JBRWIsZUFBZSxjQUFjO2tCQUM3QixRQUFRLGNBQWMsUUFBUSxLQUFLLFFBQVEsZUFBZSxPQUFPLFNBQVM7a0JBQzFFLE1BQU0sUUFBUSxLQUFLLE9BQU87O2tCQUUxQjs7O1lBR04sTUFBTTtZQUNOLE9BQU87Ozs7OztRQU1YLFFBQVEsWUFBWSxVQUFVLFFBQVEsUUFBUSxPQUFPLGVBQWU7VUFDbEUsSUFBSSxZQUFZLFVBQVUsWUFBWTtVQUN0QyxJQUFJLFlBQVksT0FBTyxXQUFXLFFBQVE7WUFDeEMsSUFBSSxDQUFDLFlBQVksU0FBUyxLQUFLLFlBQVksZUFBZTtjQUN4RCxXQUFXO21CQUNOLElBQUksYUFBYSxZQUFZOztjQUVsQyxhQUFhO2NBQ2IsS0FBSyxJQUFJLFFBQVEsR0FBRyxTQUFTLE9BQU8sUUFBUSxPQUFPLFFBQVEsUUFBUSxRQUFRLE9BQU8sVUFBVSxDQUFDLENBQUMsWUFBWSxTQUFTLEtBQUssU0FBUyxhQUFhLGVBQWUsYUFBYSxpQkFBaUIsV0FBVyxTQUFTLEdBQUc7OztVQUd0TixJQUFJLE9BQU87WUFDVCxJQUFJLENBQUMsWUFBWSxTQUFTLEtBQUssV0FBVyxhQUFhOzs7Y0FHckQsSUFBSSxDQUFDLFNBQVMsUUFBUSxLQUFLLEdBQUc7Z0JBQzVCLEtBQUssYUFBYSxJQUFJLFFBQVEsT0FBTyxRQUFRLEtBQUssV0FBVyxTQUFTLE9BQU8sY0FBYyxJQUFJOzttQkFFNUYsSUFBSSxhQUFhLGFBQWE7Y0FDbkMsYUFBYSxNQUFNLFVBQVUsS0FBSyxRQUFRLE1BQU0sTUFBTSxHQUFHOzs7Ozs7VUFNN0QsT0FBTyxVQUFVLEtBQUssUUFBUSxJQUFJLE1BQU0sTUFBTSxRQUFRLFFBQVEsVUFBVSxZQUFZLFlBQVksSUFBSSxJQUFJOzs7UUFHMUcsUUFBUSxtQkFBbUIsVUFBVSxRQUFRLFFBQVEsTUFBTTtVQUN6RCxPQUFPLFFBQVEsVUFBVSxRQUFRLFFBQVEsT0FBTzs7Ozs7TUFLcEQsSUFBSSxDQUFDLElBQUksZUFBZTtRQUN0QixJQUFJLGVBQWUsT0FBTzs7OztRQUkxQixJQUFJLFlBQVk7VUFDZCxJQUFJO1VBQ0osSUFBSTtVQUNKLElBQUk7VUFDSixJQUFJO1VBQ0osS0FBSztVQUNMLEtBQUs7VUFDTCxLQUFLO1VBQ0wsS0FBSzs7OztRQUlQLElBQUksT0FBTzs7O1FBR1gsSUFBSSxRQUFRLFlBQVk7VUFDdEIsUUFBUSxTQUFTO1VBQ2pCLE1BQU07Ozs7OztRQU1SLElBQUksTUFBTSxZQUFZO1VBQ3BCLElBQUksU0FBUyxRQUFRLFNBQVMsT0FBTyxRQUFRLE9BQU8sT0FBTyxVQUFVLFVBQVU7VUFDL0UsT0FBTyxRQUFRLFFBQVE7WUFDckIsV0FBVyxPQUFPLFdBQVc7WUFDN0IsUUFBUTtjQUNOLEtBQUssR0FBRyxLQUFLLElBQUksS0FBSyxJQUFJLEtBQUs7OztnQkFHN0I7Z0JBQ0E7Y0FDRixLQUFLLEtBQUssS0FBSyxLQUFLLEtBQUssSUFBSSxLQUFLLElBQUksS0FBSyxJQUFJLEtBQUs7OztnQkFHbEQsUUFBUSxpQkFBaUIsT0FBTyxPQUFPLFNBQVMsT0FBTztnQkFDdkQ7Z0JBQ0EsT0FBTztjQUNULEtBQUs7Ozs7O2dCQUtILEtBQUssUUFBUSxLQUFLLFNBQVMsUUFBUSxTQUFTO2tCQUMxQyxXQUFXLE9BQU8sV0FBVztrQkFDN0IsSUFBSSxXQUFXLElBQUk7OztvQkFHakI7eUJBQ0ssSUFBSSxZQUFZLElBQUk7Ozs7b0JBSXpCLFdBQVcsT0FBTyxXQUFXLEVBQUU7b0JBQy9CLFFBQVE7c0JBQ04sS0FBSyxJQUFJLEtBQUssSUFBSSxLQUFLLElBQUksS0FBSyxJQUFJLEtBQUssS0FBSyxLQUFLLEtBQUssS0FBSyxLQUFLLEtBQUs7O3dCQUVyRSxTQUFTLFVBQVU7d0JBQ25CO3dCQUNBO3NCQUNGLEtBQUs7Ozs7d0JBSUgsUUFBUSxFQUFFO3dCQUNWLEtBQUssV0FBVyxRQUFRLEdBQUcsUUFBUSxVQUFVLFNBQVM7MEJBQ3BELFdBQVcsT0FBTyxXQUFXOzs7MEJBRzdCLElBQUksRUFBRSxZQUFZLE1BQU0sWUFBWSxNQUFNLFlBQVksTUFBTSxZQUFZLE9BQU8sWUFBWSxNQUFNLFlBQVksS0FBSzs7NEJBRWhIOzs7O3dCQUlKLFNBQVMsYUFBYSxPQUFPLE9BQU8sTUFBTSxPQUFPO3dCQUNqRDtzQkFDRjs7d0JBRUU7O3lCQUVDO29CQUNMLElBQUksWUFBWSxJQUFJOzs7c0JBR2xCOztvQkFFRixXQUFXLE9BQU8sV0FBVztvQkFDN0IsUUFBUTs7b0JBRVIsT0FBTyxZQUFZLE1BQU0sWUFBWSxNQUFNLFlBQVksSUFBSTtzQkFDekQsV0FBVyxPQUFPLFdBQVcsRUFBRTs7O29CQUdqQyxTQUFTLE9BQU8sTUFBTSxPQUFPOzs7Z0JBR2pDLElBQUksT0FBTyxXQUFXLFVBQVUsSUFBSTs7a0JBRWxDO2tCQUNBLE9BQU87OztnQkFHVDtjQUNGOztnQkFFRSxRQUFROztnQkFFUixJQUFJLFlBQVksSUFBSTtrQkFDbEIsV0FBVztrQkFDWCxXQUFXLE9BQU8sV0FBVyxFQUFFOzs7Z0JBR2pDLElBQUksWUFBWSxNQUFNLFlBQVksSUFBSTs7a0JBRXBDLElBQUksWUFBWSxPQUFPLENBQUMsV0FBVyxPQUFPLFdBQVcsUUFBUSxLQUFLLFlBQVksTUFBTSxZQUFZLEtBQUs7O29CQUVuRzs7a0JBRUYsV0FBVzs7a0JBRVgsT0FBTyxRQUFRLFdBQVcsQ0FBQyxXQUFXLE9BQU8sV0FBVyxTQUFTLFlBQVksTUFBTSxZQUFZLEtBQUssUUFBUTs7O2tCQUc1RyxJQUFJLE9BQU8sV0FBVyxVQUFVLElBQUk7b0JBQ2xDLFdBQVcsRUFBRTs7b0JBRWIsT0FBTyxXQUFXLFdBQVcsQ0FBQyxXQUFXLE9BQU8sV0FBVyxZQUFZLFlBQVksTUFBTSxZQUFZLEtBQUssV0FBVztvQkFDckgsSUFBSSxZQUFZLE9BQU87O3NCQUVyQjs7b0JBRUYsUUFBUTs7OztrQkFJVixXQUFXLE9BQU8sV0FBVztrQkFDN0IsSUFBSSxZQUFZLE9BQU8sWUFBWSxJQUFJO29CQUNyQyxXQUFXLE9BQU8sV0FBVyxFQUFFOzs7b0JBRy9CLElBQUksWUFBWSxNQUFNLFlBQVksSUFBSTtzQkFDcEM7OztvQkFHRixLQUFLLFdBQVcsT0FBTyxXQUFXLFdBQVcsQ0FBQyxXQUFXLE9BQU8sV0FBVyxZQUFZLFlBQVksTUFBTSxZQUFZLEtBQUssV0FBVztvQkFDckksSUFBSSxZQUFZLE9BQU87O3NCQUVyQjs7b0JBRUYsUUFBUTs7O2tCQUdWLE9BQU8sQ0FBQyxPQUFPLE1BQU0sT0FBTzs7O2dCQUc5QixJQUFJLFVBQVU7a0JBQ1o7OztnQkFHRixJQUFJLE9BQU8sTUFBTSxPQUFPLFFBQVEsTUFBTSxRQUFRO2tCQUM1QyxTQUFTO2tCQUNULE9BQU87dUJBQ0YsSUFBSSxPQUFPLE1BQU0sT0FBTyxRQUFRLE1BQU0sU0FBUztrQkFDcEQsU0FBUztrQkFDVCxPQUFPO3VCQUNGLElBQUksT0FBTyxNQUFNLE9BQU8sUUFBUSxNQUFNLFFBQVE7a0JBQ25ELFNBQVM7a0JBQ1QsT0FBTzs7O2dCQUdUOzs7OztVQUtOLE9BQU87Ozs7UUFJVCxJQUFJLE1BQU0sVUFBVSxPQUFPO1VBQ3pCLElBQUksU0FBUztVQUNiLElBQUksU0FBUyxLQUFLOztZQUVoQjs7VUFFRixJQUFJLE9BQU8sU0FBUyxVQUFVO1lBQzVCLElBQUksQ0FBQyxpQkFBaUIsTUFBTSxPQUFPLEtBQUssTUFBTSxPQUFPLEtBQUs7O2NBRXhELE9BQU8sTUFBTSxNQUFNOzs7WUFHckIsSUFBSSxTQUFTLEtBQUs7O2NBRWhCLFVBQVU7Y0FDVixRQUFRLGVBQWUsYUFBYSxPQUFPO2dCQUN6QyxRQUFROztnQkFFUixJQUFJLFNBQVMsS0FBSztrQkFDaEI7Ozs7O2dCQUtGLElBQUksWUFBWTtrQkFDZCxJQUFJLFNBQVMsS0FBSztvQkFDaEIsUUFBUTtvQkFDUixJQUFJLFNBQVMsS0FBSzs7c0JBRWhCOzt5QkFFRzs7b0JBRUw7Ozs7Z0JBSUosSUFBSSxTQUFTLEtBQUs7a0JBQ2hCOztnQkFFRixRQUFRLEtBQUssSUFBSTs7Y0FFbkIsT0FBTzttQkFDRixJQUFJLFNBQVMsS0FBSzs7Y0FFdkIsVUFBVTtjQUNWLFFBQVEsZUFBZSxhQUFhLE9BQU87Z0JBQ3pDLFFBQVE7O2dCQUVSLElBQUksU0FBUyxLQUFLO2tCQUNoQjs7OztnQkFJRixJQUFJLFlBQVk7a0JBQ2QsSUFBSSxTQUFTLEtBQUs7b0JBQ2hCLFFBQVE7b0JBQ1IsSUFBSSxTQUFTLEtBQUs7O3NCQUVoQjs7eUJBRUc7O29CQUVMOzs7Ozs7Z0JBTUosSUFBSSxTQUFTLE9BQU8sT0FBTyxTQUFTLFlBQVksQ0FBQyxpQkFBaUIsTUFBTSxPQUFPLEtBQUssTUFBTSxPQUFPLE9BQU8sU0FBUyxLQUFLO2tCQUNwSDs7Z0JBRUYsUUFBUSxNQUFNLE1BQU0sTUFBTSxJQUFJOztjQUVoQyxPQUFPOzs7WUFHVDs7VUFFRixPQUFPOzs7O1FBSVQsSUFBSSxTQUFTLFVBQVUsUUFBUSxVQUFVLFVBQVU7VUFDakQsSUFBSSxVQUFVLEtBQUssUUFBUSxVQUFVO1VBQ3JDLElBQUksWUFBWSxPQUFPO1lBQ3JCLE9BQU8sT0FBTztpQkFDVDtZQUNMLE9BQU8sWUFBWTs7Ozs7OztRQU92QixJQUFJLE9BQU8sVUFBVSxRQUFRLFVBQVUsVUFBVTtVQUMvQyxJQUFJLFFBQVEsT0FBTyxXQUFXO1VBQzlCLElBQUksT0FBTyxTQUFTLFlBQVksT0FBTzs7OztZQUlyQyxJQUFJLFNBQVMsS0FBSyxVQUFVLFlBQVk7Y0FDdEMsS0FBSyxTQUFTLE1BQU0sUUFBUSxXQUFXO2dCQUNyQyxPQUFPLE9BQU8sUUFBUTs7bUJBRW5CO2NBQ0wsUUFBUSxPQUFPLFVBQVUsVUFBVTtnQkFDakMsT0FBTyxPQUFPLFVBQVU7Ozs7VUFJOUIsT0FBTyxTQUFTLEtBQUssUUFBUSxVQUFVOzs7O1FBSXpDLFFBQVEsUUFBUSxVQUFVLFFBQVEsVUFBVTtVQUMxQyxJQUFJLFFBQVE7VUFDWixRQUFRO1VBQ1IsU0FBUyxLQUFLO1VBQ2QsU0FBUyxJQUFJOztVQUViLElBQUksU0FBUyxLQUFLO1lBQ2hCOzs7VUFHRixRQUFRLFNBQVM7VUFDakIsT0FBTyxZQUFZLFNBQVMsS0FBSyxhQUFhLGdCQUFnQixNQUFNLFFBQVEsSUFBSSxNQUFNLE1BQU0sUUFBUSxRQUFRLElBQUksWUFBWTs7Ozs7SUFLbEksUUFBUSxrQkFBa0I7SUFDMUIsT0FBTzs7O0VBR1QsSUFBSSxlQUFlLENBQUMsVUFBVTs7SUFFNUIsYUFBYSxNQUFNO1NBQ2Q7O0lBRUwsSUFBSSxhQUFhLEtBQUs7UUFDbEIsZUFBZSxLQUFLO1FBQ3BCLGFBQWE7O0lBRWpCLElBQUksUUFBUSxhQUFhLE9BQU8sS0FBSyxXQUFXOzs7TUFHOUMsY0FBYyxZQUFZO1FBQ3hCLElBQUksQ0FBQyxZQUFZO1VBQ2YsYUFBYTtVQUNiLEtBQUssT0FBTztVQUNaLEtBQUssV0FBVztVQUNoQixhQUFhLGVBQWU7O1FBRTlCLE9BQU87Ozs7SUFJWCxLQUFLLE9BQU87TUFDVixTQUFTLE1BQU07TUFDZixhQUFhLE1BQU07Ozs7O0VBS3ZCLElBQUksVUFBVTtJQUNaLE9BQU8sWUFBWTtNQUNqQixPQUFPOzs7R0FHVixLQUFLO0FBQ1I7OztBQ3Y2QkE7OztBQUdBLFFBQVEsT0FBTyxRQUFRO0VBQ3JCO0VBQ0E7O0dBRUMsU0FBUyxLQUFLLE9BQU87O0dBRXJCLFNBQVMsTUFBTSxPQUFPO0dBQ3RCLFNBQVMsTUFBTSxPQUFPO0dBQ3RCLFNBQVMsTUFBTSxPQUFPOztHQUV0QixTQUFTLFFBQVEsT0FBTztHQUN4QixTQUFTLE9BQU8sT0FBTztHQUN2QixTQUFTLFFBQVEsT0FBTztHQUN4QixTQUFTLFFBQVEsT0FBTzs7R0FFeEIsU0FBUyxTQUFTLE9BQU8sTUFBTTs7R0FFL0IsU0FBUyxVQUFVO0lBQ2xCLFVBQVU7SUFDVixPQUFPO0lBQ1AsUUFBUTtJQUNSLFNBQVM7SUFDVCxrQkFBa0I7SUFDbEIsT0FBTzs7SUFFUCxjQUFjLE9BQU8sWUFBWTtJQUNqQyxVQUFVO01BQ1IsVUFBVTtNQUNWLE9BQU87TUFDUCxTQUFTOztJQUVYLFdBQVc7SUFDWCxXQUFXO01BQ1QsR0FBRztNQUNILEdBQUc7TUFDSCxHQUFHO01BQ0gsR0FBRztNQUNILEdBQUc7OztHQUdOLDZCQUFPLFVBQVUsbUJBQW1CO0lBQ25DO09BQ0csV0FBVyxFQUFFLFNBQVMsaUJBQWlCLE1BQU0sV0FBVyxZQUFZOztBQUUzRTs7O0FDL0NBLFFBQVEsT0FBTyxRQUFRLElBQUksQ0FBQyxrQkFBa0IsU0FBUyxnQkFBZ0IsQ0FBQyxlQUFlLElBQUksbUNBQW1DO0FBQzlILGVBQWUsSUFBSSxpQ0FBaUM7QUFDcEQsZUFBZSxJQUFJLCtCQUErQjtBQUNsRCxlQUFlLElBQUksNkJBQTZCO0FBQ2hELGVBQWUsSUFBSSxtQ0FBbUM7QUFDdEQsZUFBZSxJQUFJLDRCQUE0QjtBQUMvQyxlQUFlLElBQUksK0JBQStCO0FBQ2xELGVBQWUsSUFBSSw0QkFBNEI7QUFDL0MsZUFBZSxJQUFJLDRCQUE0QjtBQUMvQyxlQUFlLElBQUksMkJBQTJCO0FBQzlDLGVBQWUsSUFBSSxtQkFBbUI7QUFDdEMsZUFBZSxJQUFJLDhCQUE4QjtBQUNqRCxlQUFlLElBQUksZ0JBQWdCO0FBQ25DLGVBQWUsSUFBSSxtQkFBbUI7QUFDdEMsZUFBZSxJQUFJLHFCQUFxQjtBQUN4QyxlQUFlLElBQUksK0JBQStCO0FBQ2xELGVBQWUsSUFBSSxvQ0FBb0MsODNDQUE4M0M7Ozs7QUNoQnI3Qzs7QUFFQSxRQUFRLE9BQU87R0FDWixVQUFVLDRCQUFpQixTQUFTLFFBQVE7SUFDM0MsT0FBTztNQUNMLGFBQWE7TUFDYixVQUFVO01BQ1YsT0FBTztNQUNQLE1BQU0sU0FBUyw0QkFBNEI7UUFDekMsTUFBTSxTQUFTOzs7O0FBSXZCOzs7QUNiQTs7QUFFQSxRQUFRLE9BQU87R0FDWixRQUFRLDRCQUFVLFNBQVMsVUFBVSxHQUFHO0lBQ3ZDLElBQUksU0FBUzs7SUFFYixPQUFPLFNBQVM7O0lBRWhCLE9BQU8sTUFBTSxTQUFTLEtBQUssU0FBUztNQUNsQyxJQUFJLFVBQVUsQ0FBQyxLQUFLO01BQ3BCLE9BQU8sT0FBTyxLQUFLO01BQ25CLElBQUksU0FBUztRQUNYLFNBQVMsV0FBVztVQUNsQixJQUFJLFFBQVEsRUFBRSxVQUFVLE9BQU8sUUFBUTtVQUN2QyxPQUFPLFdBQVc7V0FDakI7Ozs7SUFJUCxPQUFPLGFBQWEsU0FBUyxPQUFPO01BQ2xDLE9BQU8sT0FBTyxPQUFPLE9BQU87OztJQUc5QixPQUFPOztBQUVYOzs7QUN6QkE7Ozs7Ozs7OztBQVNBLFFBQVEsT0FBTztHQUNaLFFBQVEscUVBQWEsU0FBUyxHQUFHLElBQUkscUJBQXFCLFFBQVEsU0FBUztJQUMxRSxJQUFJLFlBQVksV0FBVztNQUN6QixLQUFLLE9BQU87TUFDWixLQUFLLFNBQVM7TUFDZCxLQUFLLGNBQWMsb0JBQW9COzs7SUFHekMsSUFBSSxRQUFRLFVBQVU7O0lBRXRCLE1BQU0sZUFBZSxXQUFXO01BQzlCLEtBQUssU0FBUyxPQUFPLEtBQUssS0FBSyxNQUFNOzs7SUFHdkMsTUFBTSxPQUFPLFdBQVc7TUFDdEIsb0JBQW9CLElBQUksYUFBYSxLQUFLOzs7SUFHNUMsTUFBTSxPQUFPLFdBQVc7TUFDdEIsS0FBSyxPQUFPLG9CQUFvQixJQUFJLGdCQUFnQjtNQUNwRCxLQUFLOzs7SUFHUCxNQUFNLFFBQVEsV0FBVztNQUN2QixLQUFLLE9BQU87TUFDWixLQUFLO01BQ0wsS0FBSzs7TUFFTCxPQUFPLGVBQWUsT0FBTyxRQUFROzs7SUFHdkMsTUFBTSxTQUFTLFNBQVMsT0FBTztNQUM3QixJQUFJLFlBQVksTUFBTTs7TUFFdEIsSUFBSSxLQUFLLEtBQUssWUFBWTtRQUN4QixLQUFLLE9BQU87YUFDUDtRQUNMLEtBQUssSUFBSTs7OztJQUliLE1BQU0sTUFBTSxTQUFTLE9BQU87TUFDMUIsSUFBSSxZQUFZLE1BQU07O01BRXRCLFFBQVEsSUFBSSxVQUFVLE1BQU0sUUFBUTs7TUFFcEMsTUFBTSxhQUFhLElBQUksT0FBTzs7TUFFOUIsTUFBTSxRQUFRLFFBQVE7O01BRXRCLEtBQUssS0FBSyxhQUFhLEVBQUUsVUFBVTtNQUNuQyxLQUFLO01BQ0wsS0FBSzs7TUFFTCxPQUFPLGVBQWUsT0FBTyxRQUFRLGNBQWM7OztJQUdyRCxNQUFNLFNBQVMsU0FBUyxPQUFPO01BQzdCLElBQUksWUFBWSxNQUFNOztNQUV0QixRQUFRLElBQUksWUFBWSxNQUFNLFFBQVE7O01BRXRDLE9BQU8sS0FBSyxLQUFLO01BQ2pCLEtBQUs7TUFDTCxLQUFLOztNQUVMLE9BQU8sZUFBZSxPQUFPLFFBQVEsaUJBQWlCOzs7SUFHeEQsTUFBTSxlQUFlLFNBQVMsV0FBVztNQUN2QyxPQUFPLGFBQWEsS0FBSzs7O0lBRzNCLE9BQU8sSUFBSTs7QUFFZjs7O0FDcEZBOzs7Ozs7OztBQVFBLFFBQVEsT0FBTztHQUNaLFVBQVUsa0RBQWdCLFVBQVUsV0FBVyxRQUFRLFFBQVE7SUFDOUQsT0FBTztNQUNMLGFBQWE7TUFDYixVQUFVO01BQ1YsU0FBUztNQUNULE9BQU87UUFDTCxhQUFhOztNQUVmLE1BQU0sU0FBUyxTQUFTLDRCQUE0Qjs7OztRQUlsRCxPQUFPLGVBQWUsT0FBTyxRQUFRO1FBQ3JDLE1BQU0scUJBQXFCLFdBQVc7VUFDcEMsT0FBTyxlQUFlLE9BQU8sUUFBUTs7O1FBR3ZDLE1BQU0sWUFBWTtRQUNsQixNQUFNLFNBQVM7Ozs7QUFJdkI7OztBQy9CQTs7OztBQUlBLFFBQVEsT0FBTztHQUNaLFFBQVEsc0JBQVUsU0FBUyxJQUFJLEdBQUc7SUFDakMsSUFBSSxTQUFTOztJQUViLE9BQU8sU0FBUyxHQUFHLE9BQU8sT0FBTyxXQUFXO0lBQzVDLE9BQU8sYUFBYSxHQUFHLE9BQU8sT0FBTyxXQUFXOztJQUVoRCxPQUFPLE9BQU8sR0FBRyxPQUFPLEtBQUssWUFBWSxPQUFPO0lBQ2hELE9BQU8sU0FBUyxHQUFHLE9BQU8sS0FBSyxZQUFZLE9BQU87O0lBRWxELE9BQU8sWUFBWSxXQUFXO01BQzVCLE9BQU8sRUFBRSxVQUFVLE9BQU87OztJQUc1QixPQUFPLFVBQVUsV0FBVztNQUMxQixPQUFPLE9BQU87OztJQUdoQixPQUFPLFFBQVEsV0FBVztNQUN4QixPQUFPO1FBQ0wsYUFBYTtRQUNiLGNBQWM7UUFDZCx5QkFBeUI7Ozs7SUFJN0IsT0FBTyxRQUFRLFdBQVc7TUFDeEIsT0FBTzs7O0lBR1QsT0FBTyxnQkFBZ0IsU0FBUyxTQUFTLE1BQU07TUFDN0MsSUFBSSxRQUFRLFFBQVE7UUFDbEIsT0FBTyxLQUFLLFNBQVMsUUFBUTtRQUM3QixPQUFPLE9BQU8sS0FBSztRQUNuQixPQUFPLEtBQUssYUFBYTthQUNwQjtRQUNMLE9BQU8sS0FBSyxNQUFNLFFBQVE7UUFDMUIsT0FBTyxPQUFPLEtBQUs7UUFDbkIsT0FBTyxLQUFLLGFBQWE7Ozs7SUFJN0IsT0FBTzs7QUFFWDs7O0FDaERBOzs7Ozs7OztBQVFBLFFBQVEsT0FBTztHQUNaLFVBQVUsa0RBQW1CLFVBQVUsT0FBTyxTQUFTLFFBQVE7SUFDOUQsT0FBTztNQUNMLGFBQWE7TUFDYixVQUFVO01BQ1YsU0FBUztNQUNULFNBQVM7TUFDVCxPQUFPO01BQ1AsTUFBTSxTQUFTLFNBQVMsT0FBTyxTQUFTLE9BQU8saUJBQWlCOzs7UUFHOUQsU0FBUyxhQUFhO1VBQ3BCLElBQUksaUJBQWlCO1lBQ25CLGdCQUFnQjs7Ozs7UUFLcEIsTUFBTSxlQUFlLE9BQU87UUFDNUIsTUFBTSxnQkFBZ0I7UUFDdEIsTUFBTSxlQUFlOztRQUVyQixNQUFNLGVBQWUsU0FBUyxPQUFPO1VBQ25DLE9BQU8sTUFBTSxJQUFJLE1BQU0sZUFBZSx3QkFBd0I7YUFDM0QsS0FBSyxTQUFTLFVBQVU7Y0FDdkIsTUFBTSxnQkFBZ0IsU0FBUzs7Ozs7UUFLckMsTUFBTSxhQUFhOztRQUVuQixNQUFNLGFBQWEsU0FBUyxTQUFTO1VBQ25DLE9BQU8sUUFBUSxXQUFXLE1BQU0sUUFBUSxjQUFjLE1BQU0sUUFBUTs7O1FBR3RFLE1BQU0sYUFBYSxTQUFTLGNBQWM7VUFDeEMsSUFBSSxVQUFVO1lBQ1osT0FBTztZQUNQLE1BQU0sYUFBYTtZQUNuQixLQUFLLE1BQU0sZUFBZSxtQkFBbUIsYUFBYTtjQUN4RCxjQUFjLGFBQWE7Y0FDM0IsZUFBZSxhQUFhLGVBQWU7OztVQUcvQyxRQUFRLE9BQU87VUFDZixRQUFRLFVBQVUsUUFBUSxJQUFJO1VBQzlCLFFBQVEsT0FBTyxRQUFROztVQUV2Qjs7Ozs7QUFLVjs7O0FDOURBOzs7Ozs7OztBQVFBLFFBQVEsT0FBTztHQUNaLFVBQVUsdUNBQWlCLFVBQVUsU0FBUyxRQUFRO0lBQ3JELE9BQU87TUFDTCxhQUFhO01BQ2IsVUFBVTtNQUNWLFNBQVM7TUFDVCxTQUFTO01BQ1QsT0FBTztNQUNQLE1BQU0sU0FBUyxTQUFTLE9BQU8sU0FBUyxPQUFPLGlCQUFpQjs7O1FBRzlELFNBQVMsYUFBYTtVQUNwQixJQUFJLGlCQUFpQjtZQUNuQixnQkFBZ0I7Ozs7O1FBS3BCLE1BQU0sZUFBZTtVQUNuQixPQUFPOzs7UUFHVCxNQUFNLGFBQWEsU0FBUyxTQUFTO1VBQ25DLE9BQU8sZUFBZSxPQUFPLFFBQVEsaUJBQWlCLFFBQVE7OztVQUc5RCxRQUFRLFVBQVUsUUFBUSxJQUFJOzs7VUFHOUIsUUFBUSxPQUFPLFFBQVE7O1VBRXZCOzs7OztBQUtWOzs7QUM1Q0E7Ozs7Ozs7Ozs7OztBQVlBLFFBQVEsT0FBTztHQUNaLE9BQU8saUJBQVcsU0FBUyxHQUFHO0lBQzdCLE9BQU8sU0FBUyxLQUFLLGNBQWM7TUFDakMsT0FBTyxFQUFFLE1BQU0sS0FBSztRQUNsQixPQUFPOzs7Ozs7Ozs7OztBQVdmLFFBQVEsT0FBTztHQUNaLFVBQVUsd0NBQXVCLFVBQVUsU0FBUyxHQUFHO0lBQ3RELE9BQU87TUFDTCxhQUFhO01BQ2IsVUFBVTtNQUNWLFNBQVM7TUFDVCxTQUFTO01BQ1QsT0FBTztNQUNQLE1BQU0sU0FBUyxTQUFTLE9BQU8sU0FBUyxPQUFPLGlCQUFpQjs7O1FBRzlELFNBQVMsYUFBYTtVQUNwQixJQUFJLGlCQUFpQjtZQUNuQixnQkFBZ0I7Ozs7O1FBS3BCLE1BQU0sVUFBVTs7UUFFaEIsTUFBTSxXQUFXLEVBQUUsT0FBTyxRQUFRLFVBQVUsU0FBUyxTQUFTO1VBQzVELE9BQU8sUUFBUSxVQUFVOzs7UUFHM0IsTUFBTSxhQUFhLEVBQUUsTUFBTSxRQUFRLFVBQVU7VUFDM0MsT0FBTzs7O1FBR1QsTUFBTSxPQUFPLFdBQVc7VUFDdEIsT0FBTyxRQUFRLFNBQVM7V0FDdkIsV0FBVztVQUNaLE1BQU0sV0FBVyxFQUFFLE9BQU8sUUFBUSxVQUFVLFNBQVMsU0FBUztZQUM1RCxPQUFPLFFBQVEsVUFBVTs7OztRQUk3QixNQUFNLGdCQUFnQixTQUFTLFNBQVM7O1VBRXRDLFFBQVEsT0FBTztVQUNmOzs7OztBQUtWOzs7QUN2RUE7O0FBRUEsU0FBUyxXQUFXLFlBQVk7RUFDOUIsT0FBTyxXQUFXLE9BQU8sU0FBUyxHQUFHLE9BQU87SUFDMUMsRUFBRSxNQUFNLFFBQVE7SUFDaEIsT0FBTztLQUNOOzs7QUFHTCxRQUFRLE9BQU87R0FDWixRQUFRLHdGQUFXLFNBQVMsT0FBTyxJQUFJLFFBQVEsR0FBRyxJQUFJLElBQUksWUFBWSxRQUFRLFFBQVE7SUFDckYsSUFBSSxVQUFVOzs7SUFHZCxJQUFJLFdBQVc7O0lBRWYsUUFBUSxXQUFXO0lBQ25CLFFBQVEsVUFBVSxTQUFTO0lBQzNCLFFBQVEsaUJBQWlCO0lBQ3pCLFFBQVEsYUFBYTtJQUNyQixRQUFRLFdBQVcsU0FBUztJQUM1QixRQUFRLFFBQVE7SUFDaEIsUUFBUSxPQUFPOztJQUVmLElBQUksWUFBWTtNQUNkLEdBQUc7TUFDSCxHQUFHO01BQ0gsR0FBRztNQUNILEdBQUc7TUFDSCxHQUFHOzs7SUFHTCxRQUFRLGVBQWU7O0lBRXZCLFFBQVEsYUFBYSxPQUFPLFNBQVMsT0FBTztNQUMxQyxJQUFJLE1BQU0sWUFBWSxTQUFTLE9BQU87TUFDdEMsT0FBTyxVQUFVLE1BQU07OztJQUd6QixRQUFRLGFBQWEsZUFBZSxTQUFTLE9BQU87TUFDbEQsT0FBTyxRQUFRLGFBQWEsS0FBSyxTQUFTO1NBQ3ZDLE1BQU0sY0FBYyxVQUFVLE1BQU0sTUFBTSxLQUFLOzs7O0lBSXBELFFBQVEsYUFBYSxXQUFXLFdBQVc7TUFDekMsT0FBTzs7O0lBR1QsUUFBUSxhQUFhLE9BQU8sU0FBUyxPQUFPO01BQzFDLE9BQU8sTUFBTTs7O0lBR2YsUUFBUSxhQUFhLGNBQWMsU0FBUyxPQUFPLE9BQU87TUFDeEQsT0FBTyxNQUFNLE1BQU0sTUFBTTs7O0lBRzNCLFFBQVEsYUFBYSxRQUFRLGFBQWE7O0lBRTFDLFFBQVEsWUFBWSxTQUFTLE1BQU0sT0FBTyxPQUFPO01BQy9DLElBQUksUUFBUSxHQUFHLEtBQUssU0FBUztRQUMzQixTQUFTLEVBQUUsT0FBTyxPQUFPLFNBQVMsR0FBRyxNQUFNLE1BQU07VUFDL0MsSUFBSSxRQUFRO1lBQ1YsTUFBTTtZQUNOLE1BQU0sR0FBRyxLQUFLLE1BQU07WUFDcEIsZUFBZTs7O1VBR2pCLElBQUksTUFBTSxTQUFTLE9BQU8sTUFBTSxNQUFNLE1BQU0sWUFBWSxHQUFHO1lBQ3pELE1BQU0sT0FBTzs7O1VBR2YsRUFBRSxLQUFLO1VBQ1AsT0FBTztXQUNOOztNQUVMLFNBQVMsR0FBRyxXQUFXLFFBQVEsU0FBUyxRQUFRLGFBQWEsY0FBYyxRQUFRLGFBQWE7O01BRWhHLE9BQU8sS0FBSyxHQUFHLE9BQU87TUFDdEIsT0FBTzs7OztJQUlULFFBQVEsV0FBVzs7SUFFbkIsUUFBUSxTQUFTLFNBQVMsU0FBUztNQUNqQyxJQUFJOztNQUVKLE9BQU8sZUFBZSxPQUFPLFFBQVEsZ0JBQWdCLFFBQVE7O01BRTdELElBQUksUUFBUSxRQUFRO1FBQ2xCLGdCQUFnQixHQUFHLFNBQVMsU0FBUyxRQUFROztVQUUzQyxRQUFRLE9BQU87VUFDZixRQUFRLGVBQWUsU0FBUyxRQUFRO1VBQ3hDOzthQUVHO1FBQ0wsZ0JBQWdCLE1BQU0sSUFBSSxRQUFRLEtBQUssQ0FBQyxPQUFPLE9BQU8sS0FBSyxTQUFTLFVBQVU7VUFDNUUsSUFBSTs7O1VBR0osSUFBSSxFQUFFLFNBQVMsU0FBUyxPQUFPO2FBQzVCLE9BQU8sU0FBUzthQUNoQixRQUFRLE9BQU87aUJBQ1g7WUFDTCxPQUFPLEdBQUcsS0FBSyxTQUFTLE1BQU0sQ0FBQyxNQUFNO1lBQ3JDLFFBQVEsT0FBTzs7O1VBR2pCLFFBQVEsZUFBZSxTQUFTOzs7O01BSXBDLFFBQVEsU0FBUyxRQUFRLFNBQVMsVUFBVTtRQUMxQyxnQkFBZ0IsY0FBYyxLQUFLOzs7O01BSXJDLGNBQWMsS0FBSyxXQUFXO1FBQzVCLE9BQU8sY0FBYyxTQUFTLFFBQVE7OztNQUd4QyxPQUFPOzs7SUFHVCxRQUFRLGlCQUFpQixTQUFTLFNBQVMsTUFBTTtNQUMvQyxRQUFRLE9BQU87O01BRWYsUUFBUSxpQkFBaUI7TUFDekIsUUFBUSxRQUFRLEdBQUcsS0FBSyxNQUFNLFFBQVE7O01BRXRDLEtBQUssSUFBSSxhQUFhLFFBQVEsT0FBTztRQUNuQyxJQUFJLGNBQWMsS0FBSztVQUNyQixRQUFRLE1BQU0sV0FBVyxTQUFTLEVBQUUsT0FBTyxFQUFFLE1BQU0sUUFBUSxNQUFNLFlBQVk7Ozs7TUFJakYsUUFBUSxhQUFhLFFBQVEsVUFBVSxRQUFRLE1BQU0sUUFBUTtNQUM3RCxRQUFRLFdBQVcsU0FBUyxXQUFXLFFBQVE7OztJQUdqRCxRQUFRLE1BQU0sU0FBUyxTQUFTO01BQzlCLElBQUksQ0FBQyxRQUFRLElBQUk7UUFDZixRQUFRLEtBQUssUUFBUTs7TUFFdkIsU0FBUyxLQUFLOztNQUVkLE9BQU87OztJQUdULE9BQU87O0FBRVg7OztBQ3pKQTs7Ozs7Ozs7QUFRQSxRQUFRLE9BQU87R0FDWixVQUFVLGdCQUFnQixZQUFZO0lBQ3JDLE9BQU87TUFDTCxhQUFhO01BQ2IsVUFBVTtNQUNWLE9BQU87OztBQUdiOzs7QUNoQkE7O0FBRUEsUUFBUSxPQUFPO0dBQ1osVUFBVSx3Q0FBbUIsU0FBUyxRQUFRLFFBQVE7SUFDckQsT0FBTztNQUNMLGFBQWE7TUFDYixVQUFVO01BQ1YsU0FBUztNQUNULE9BQU87TUFDUCxNQUFNLFNBQVMsU0FBUywyQkFBMkI7UUFDakQsTUFBTSxjQUFjLFdBQVc7VUFDN0IsT0FBTyxlQUFlLE9BQU8sUUFBUTtVQUNyQyxPQUFPLEtBQUs7Ozs7O0FBS3RCOzs7QUNqQkE7Ozs7Ozs7O0FBUUEsUUFBUSxPQUFPOztHQUVaLFNBQVMsY0FBYyxPQUFPO0dBQzlCLFVBQVUsbURBQWdCLFVBQVUsUUFBUSxRQUFRLFlBQVk7Ozs7SUFJL0QsU0FBUyxZQUFZLE1BQU0sU0FBUzs7Ozs7TUFLbEMsT0FBTyxDQUFDLGFBQWEsT0FBTyxPQUFPLE9BQU8sQ0FBQzs7O0lBRzdDLFNBQVMsWUFBWSxNQUFNLGdCQUFnQjs7O01BR3pDLE9BQU8sQ0FBQyxvQkFBb0IsZUFBZSxRQUFRLFFBQVEsQ0FBQzs7O0lBRzlELE9BQU87TUFDTCxhQUFhO01BQ2IsU0FBUztNQUNULFVBQVU7O01BRVYsWUFBWTtNQUNaLE9BQU87UUFDTCxhQUFhO1FBQ2IsZ0JBQWdCOzs7UUFHaEIsU0FBUzs7TUFFWCxNQUFNLFVBQVUsT0FBTyxvQkFBb0I7UUFDekMsTUFBTSxVQUFVLE1BQU0sV0FBVzs7UUFFakMsUUFBUSxHQUFHLHNCQUFzQixTQUFTLFlBQVksT0FBTztVQUMzRCxJQUFJLE9BQU87WUFDVCxNQUFNOztVQUVSLE1BQU0sY0FBYyxhQUFhLGdCQUFnQjs7O1FBR25ELFNBQVMsU0FBUyxNQUFNO1VBQ3RCLElBQUksQ0FBQyxZQUFZLEtBQUssTUFBTSxNQUFNLGlCQUFpQjtZQUNqRCxNQUFNLE9BQU8sV0FBVztjQUN0QixPQUFPLElBQUksNkRBQTZELE1BQU07O1lBRWhGOztVQUVGLElBQUksQ0FBQyxZQUFZLEtBQUssTUFBTSxNQUFNLGNBQWM7WUFDOUMsTUFBTSxPQUFPLFdBQVc7Y0FDdEIsT0FBTyxJQUFJLCtCQUErQixNQUFNLGNBQWM7O1lBRWhFOztVQUVGLElBQUksU0FBUyxJQUFJOztVQUVqQixPQUFPLFNBQVMsU0FBUyxLQUFLO1lBQzVCLE9BQU8sTUFBTSxPQUFPLFNBQVMsT0FBTztjQUNsQyxNQUFNLFFBQVEsT0FBTyxJQUFJLE9BQU87O2NBRWhDLE1BQU0sUUFBUSxPQUFPLEtBQUssS0FBSyxRQUFRLFVBQVU7Ozs7VUFJckQsT0FBTyxVQUFVLFdBQVc7WUFDMUIsT0FBTyxJQUFJOzs7VUFHYixPQUFPLFdBQVc7OztRQUdwQixRQUFRLEdBQUcsUUFBUSxTQUFTLE9BQU8sT0FBTztVQUN4QyxJQUFJLE9BQU87WUFDVCxNQUFNOzs7VUFHUixTQUFTLE1BQU0sY0FBYyxhQUFhLE1BQU07OztRQUdsRCxRQUFRLEtBQUssc0JBQXNCLEdBQUcsVUFBVSxTQUFTLG9CQUFvQjs7VUFFM0UsU0FBUyxLQUFLLE1BQU07Ozs7OztBQU05Qjs7O0FDbEdBOzs7Ozs7OztBQVFBLFFBQVEsT0FBTztHQUNaLFVBQVUsMkRBQWdCLFVBQVUsU0FBUyxRQUFRLFFBQVEsR0FBRyxJQUFJO0lBQ25FLE9BQU87TUFDTCxhQUFhO01BQ2IsVUFBVTtNQUNWLFNBQVM7TUFDVCxTQUFTO01BQ1QsT0FBTztNQUNQLE1BQU0sU0FBUyxTQUFTLE9BQU8sU0FBUyxPQUFPLGlCQUFpQjs7O1FBRzlELFNBQVMsYUFBYTtVQUNwQixJQUFJLGlCQUFpQjtZQUNuQixnQkFBZ0I7Ozs7O1FBS3BCLE1BQU0sVUFBVTtVQUNkLE1BQU07VUFDTixNQUFNOzs7UUFHUixNQUFNLGFBQWEsV0FBVztVQUM1QixJQUFJLE9BQU8sR0FBRyxLQUFLLE1BQU0sUUFBUSxNQUFNO1lBQ3JDLE1BQU07OztVQUdSLElBQUksZ0JBQWdCO1lBQ2xCLElBQUksS0FBSztZQUNULE1BQU0sTUFBTSxRQUFRO1lBQ3BCLFFBQVE7WUFDUixPQUFPOzs7O1VBSVQsT0FBTyxlQUFlLE9BQU8sUUFBUSxtQkFBbUIsY0FBYzs7O1VBR3RFLFFBQVEsVUFBVSxRQUFRLElBQUk7OztVQUc5QixRQUFRLE9BQU8sUUFBUTs7O1VBR3ZCOzs7OztBQUtWOzs7QUMxREEsUUFBUSxPQUFPLFFBQVEsU0FBUyxjQUFjLENBQUM7RUFDN0MsTUFBTTtFQUNOLGFBQWE7RUFDYixLQUFLO0VBQ0wsSUFBSTtFQUNKLE9BQU87RUFDUDtFQUNBLE1BQU07RUFDTixhQUFhO0VBQ2IsS0FBSztFQUNMLElBQUk7RUFDSixPQUFPO0VBQ1A7RUFDQSxNQUFNO0VBQ04sS0FBSztFQUNMLElBQUk7RUFDSixPQUFPO0VBQ1A7RUFDQSxNQUFNO0VBQ04sS0FBSztFQUNMLElBQUk7RUFDSixPQUFPO0VBQ1A7RUFDQSxNQUFNO0VBQ04sS0FBSztFQUNMLElBQUk7RUFDSixPQUFPO0VBQ1A7RUFDQSxNQUFNO0VBQ04sS0FBSztFQUNMLElBQUk7RUFDSixPQUFPO0VBQ1A7RUFDQSxNQUFNO0VBQ04sS0FBSztFQUNMLElBQUk7RUFDSixPQUFPO0VBQ1A7RUFDQSxNQUFNO0VBQ04sS0FBSztFQUNMLElBQUk7RUFDSixPQUFPO0VBQ1A7RUFDQSxNQUFNO0VBQ04sS0FBSztFQUNMLElBQUk7RUFDSixPQUFPO0VBQ1A7RUFDQSxNQUFNO0VBQ04sS0FBSztFQUNMLElBQUk7RUFDSixPQUFPO0VBQ1A7RUFDQSxNQUFNO0VBQ04sS0FBSztFQUNMLElBQUk7RUFDSixPQUFPO0VBQ1A7RUFDQSxNQUFNO0VBQ04sS0FBSztFQUNMLElBQUk7RUFDSixPQUFPO0VBQ1A7RUFDQSxNQUFNO0VBQ04sS0FBSztFQUNMLElBQUk7RUFDSixPQUFPOztBQUVUOzs7QUNwRUE7Ozs7Ozs7O0FBUUEsUUFBUSxPQUFPO0dBQ1osVUFBVSxpREFBYSxVQUFVLFNBQVMsTUFBTSxJQUFJLFFBQVE7SUFDM0QsT0FBTztNQUNMLGFBQWE7TUFDYixVQUFVO01BQ1YsU0FBUztNQUNULE9BQU87UUFDTCxPQUFPO1FBQ1AsVUFBVTtRQUNWLFVBQVU7UUFDVixXQUFXO1FBQ1gsY0FBYztRQUNkLFlBQVk7UUFDWixjQUFjO1FBQ2QsUUFBUTtRQUNSLG1CQUFtQjs7TUFFckIsTUFBTSxTQUFTLE9BQU8sU0FBUztRQUM3QixJQUFJOztRQUVKLE1BQU0sWUFBWSxPQUFPO1FBQ3pCLE1BQU0sUUFBUSxRQUFRLE1BQU0sTUFBTSxNQUFNO1FBQ3hDLE1BQU0sVUFBVSxHQUFHLE9BQU87O1FBRTFCLE9BQU8sTUFBTSxNQUFNO1VBQ2pCLEtBQUs7WUFDSCxNQUFNLE9BQU87WUFDYjtVQUNGLEtBQUs7WUFDSCxNQUFNLE9BQU87WUFDYjtVQUNGLEtBQUs7WUFDSCxNQUFNLE9BQU87WUFDYjtVQUNGLEtBQUs7WUFDSCxNQUFNLE9BQU87WUFDYjs7O1FBR0osTUFBTSxVQUFVLFNBQVMsT0FBTztVQUM5QixHQUFHLE1BQU0sVUFBVSxPQUFPLFdBQVcsUUFBUSxLQUFLLGtCQUFrQjtZQUNsRSxPQUFPLFdBQVcsUUFBUSxLQUFLLGFBQWEsSUFBSTtZQUNoRCxNQUFNLE9BQU87Ozs7UUFJakIsTUFBTSxPQUFPLFNBQVMsT0FBTztVQUMzQixPQUFPLE1BQU0sYUFBYSxNQUFNO2FBQzdCLE1BQU0sT0FBTztZQUNkLE1BQU0sY0FBYyxNQUFNO2FBQ3pCLE1BQU0sUUFBUSxXQUFXLE1BQU0sUUFBUTs7O1FBRzVDLE1BQU0sT0FBTyxnQkFBZ0IsU0FBUyxjQUFjO1VBQ2xELElBQUksQ0FBQyxjQUFjLEVBQUU7O1VBRXJCLElBQUksWUFBWTtZQUNkLFdBQVc7OztVQUdiLGFBQWEsSUFBSSxLQUFLO1lBQ3BCLFNBQVM7WUFDVCxRQUFRLFFBQVEsS0FBSyxlQUFlO1lBQ3BDLFVBQVU7WUFDVixRQUFROzs7O1FBSVosTUFBTSxJQUFJLFlBQVksV0FBVztVQUMvQixJQUFJLFlBQVk7WUFDZCxXQUFXOzs7Ozs7QUFNdkI7OztBQ3BGQTs7Ozs7Ozs7O0FBU0EsUUFBUSxPQUFPO0dBQ1osUUFBUSwwREFBVSxVQUFVLFdBQVcsU0FBUyxRQUFRLFdBQVc7O0lBRWxFLElBQUksVUFBVTs7SUFFZCxRQUFRLFNBQVM7TUFDZixLQUFLLENBQUMsR0FBRyxPQUFPLEtBQUs7TUFDckIsT0FBTyxDQUFDLEdBQUcsU0FBUyxLQUFLO01BQ3pCLE9BQU8sQ0FBQyxHQUFHLFNBQVMsS0FBSztNQUN6QixNQUFNLENBQUMsR0FBRyxRQUFRLEtBQUs7TUFDdkIsTUFBTSxDQUFDLEdBQUcsUUFBUSxLQUFLO01BQ3ZCLE9BQU8sQ0FBQyxHQUFHLFNBQVMsS0FBSztNQUN6QixPQUFPLENBQUMsR0FBRyxTQUFTLEtBQUs7OztJQUczQixRQUFRLFVBQVU7O01BRWhCLFlBQVksQ0FBQyxVQUFVLFFBQVEsSUFBSSxjQUFjLE9BQU8sUUFBUSxPQUFPO01BQ3ZFLE1BQU0sQ0FBQyxVQUFVLFFBQVEsSUFBSSxRQUFRLE9BQU8sUUFBUSxPQUFPO01BQzNELE1BQU0sQ0FBQyxVQUFVLFFBQVEsSUFBSSxRQUFRLE9BQU8sUUFBUSxPQUFPO01BQzNELGdCQUFnQixDQUFDLFVBQVUsUUFBUSxJQUFJLGtCQUFrQixPQUFPLFFBQVEsT0FBTztNQUMvRSxjQUFjLENBQUMsVUFBVSxRQUFRLElBQUksZ0JBQWdCLE9BQU8sUUFBUSxPQUFPO01BQzNFLG1CQUFtQixDQUFDLFVBQVUsUUFBUSxJQUFJLHFCQUFxQixPQUFPLFFBQVEsT0FBTztNQUNyRixpQkFBaUIsQ0FBQyxVQUFVLFFBQVEsSUFBSSxtQkFBbUIsT0FBTyxRQUFRLE9BQU87O01BRWpGLGNBQWMsQ0FBQyxVQUFVLFlBQVksR0FBRyxnQkFBZ0IsT0FBTyxRQUFRLE9BQU87TUFDOUUsaUJBQWlCLENBQUMsVUFBVSxZQUFZLEdBQUcsbUJBQW1CLE9BQU8sUUFBUSxPQUFPO01BQ3BGLGVBQWUsQ0FBQyxVQUFVLFlBQVksR0FBRyxpQkFBaUIsT0FBTyxRQUFRLE9BQU87TUFDaEYsZ0JBQWdCLENBQUMsVUFBVSxZQUFZLEdBQUcsa0JBQWtCLE9BQU8sUUFBUSxPQUFPO01BQ2xGLGdCQUFnQixDQUFDLFVBQVUsWUFBWSxJQUFJLGtCQUFrQixPQUFPLFFBQVEsT0FBTzs7TUFFbkYsaUJBQWlCLENBQUMsVUFBVSxTQUFTLEdBQUcsbUJBQW1CLE9BQU8sUUFBUSxPQUFPO01BQ2pGLGdCQUFnQixDQUFDLFVBQVUsU0FBUyxHQUFHLGtCQUFrQixPQUFPLFFBQVEsT0FBTztNQUMvRSxjQUFjLENBQUMsVUFBVSxTQUFTLEdBQUcsZ0JBQWdCLE9BQU8sUUFBUSxPQUFPO01BQzNFLGNBQWMsQ0FBQyxVQUFVLFNBQVMsR0FBRyxnQkFBZ0IsT0FBTyxRQUFRLE9BQU87TUFDM0UsZUFBZSxDQUFDLFVBQVUsU0FBUyxHQUFHLGlCQUFpQixPQUFPLFFBQVEsT0FBTztNQUM3RSxtQkFBbUIsQ0FBQyxVQUFVLFNBQVMsR0FBRyxxQkFBcUIsT0FBTyxRQUFRLE9BQU87O01BRXJGLGFBQWEsQ0FBQyxVQUFVLFNBQVMsR0FBRyxlQUFlLE9BQU8sUUFBUSxPQUFPO01BQ3pFLGlCQUFpQixDQUFDLFVBQVUsU0FBUyxHQUFHLG1CQUFtQixPQUFPLFFBQVEsT0FBTztNQUNqRixpQkFBaUIsQ0FBQyxVQUFVLFNBQVMsR0FBRyxtQkFBbUIsT0FBTyxRQUFRLE9BQU87TUFDakYsa0JBQWtCLENBQUMsVUFBVSxTQUFTLElBQUksb0JBQW9CLE9BQU8sUUFBUSxPQUFPO01BQ3BGLFlBQVksQ0FBQyxVQUFVLFNBQVMsSUFBSSxjQUFjLE9BQU8sUUFBUSxPQUFPO01BQ3hFLGtCQUFrQixDQUFDLFVBQVUsU0FBUyxJQUFJLG9CQUFvQixPQUFPLFFBQVEsT0FBTztNQUNwRixvQkFBb0IsQ0FBQyxVQUFVLFNBQVMsR0FBRyxzQkFBc0IsT0FBTyxRQUFRLE9BQU87O01BRXZGLGdCQUFnQixDQUFDLFVBQVUsU0FBUyxHQUFHLGtCQUFrQixPQUFPLFFBQVEsT0FBTztNQUMvRSxXQUFXLENBQUMsVUFBVSxTQUFTLEdBQUcsYUFBYSxPQUFPLFFBQVEsT0FBTzs7O01BR3JFLGVBQWUsQ0FBQyxVQUFVLFVBQVUsSUFBSSxpQkFBaUIsT0FBTyxRQUFRLE9BQU87TUFDL0UsY0FBYyxDQUFDLFVBQVUsVUFBVSxJQUFJLGdCQUFnQixPQUFPLFFBQVEsT0FBTztNQUM3RSxhQUFhLENBQUMsVUFBVSxVQUFVLElBQUksZUFBZSxPQUFPLFFBQVEsT0FBTzs7O01BRzNFLGFBQWEsQ0FBQyxTQUFTLFlBQVksSUFBSSxlQUFlLE9BQU8sUUFBUSxPQUFPO01BQzVFLFlBQVksQ0FBQyxVQUFVLFlBQVksSUFBSSxjQUFjLE9BQU8sUUFBUSxPQUFPO01BQzNFLGFBQWEsQ0FBQyxVQUFVLFlBQVksSUFBSSxlQUFlLE9BQU8sUUFBUSxPQUFPOzs7SUFHL0UsUUFBUSxpQkFBaUIsU0FBUyxRQUFRLE9BQU8sTUFBTTtNQUNyRCxJQUFJLENBQUMsT0FBTyxTQUFTO1FBQ25COztNQUVGLElBQUksUUFBUSxPQUFPLEtBQUssUUFBUTtNQUNoQyxHQUFHLE9BQU8sTUFBTSxRQUFRLFFBQVEsT0FBTyxLQUFLLE1BQU07UUFDaEQsVUFBVSxXQUFXLE9BQU8sVUFBVSxPQUFPLElBQUksT0FBTztRQUN4RCxRQUFRLElBQUksY0FBYyxPQUFPLElBQUksT0FBTzs7OztJQUloRCxRQUFRLGVBQWUsUUFBUSxRQUFRLFlBQVksT0FBTzs7SUFFMUQsT0FBTzs7QUFFWDs7O0FDcEZBOzs7Ozs7OztBQVFBLFFBQVEsT0FBTztHQUNaLFVBQVUsb0JBQVMsVUFBVSxRQUFRO0lBQ3BDLE9BQU87TUFDTCxhQUFhO01BQ2IsVUFBVTtNQUNWLFlBQVk7TUFDWixPQUFPO1FBQ0wsVUFBVTtRQUNWLFVBQVU7OztNQUdaLHVCQUFZLFNBQVMsUUFBUTtRQUMzQixLQUFLLFFBQVEsV0FBVztVQUN0QixPQUFPLFNBQVM7OztNQUdwQixNQUFNLFNBQVMsT0FBTyxTQUFTLE9BQU87UUFDcEMsSUFBSSxVQUFVLE1BQU07O1FBRXBCLElBQUksTUFBTSxVQUFVO1VBQ2xCLE1BQU0sZUFBZSxlQUFlLE1BQU07Ozs7UUFJNUMsTUFBTSxTQUFTLE1BQU07OztRQUdyQixPQUFPLFNBQVMsU0FBUztRQUN6QixNQUFNLElBQUksWUFBWSxXQUFXO1VBQy9CLE9BQU8sV0FBVzs7Ozs7QUFLNUI7OztBQzFDQTs7Ozs7Ozs7QUFRQSxRQUFRLE9BQU87R0FDWixVQUFVLG9CQUFvQixXQUFXO0lBQ3hDLE9BQU87TUFDTCxhQUFhO01BQ2IsVUFBVTtNQUNWLFNBQVM7TUFDVCxPQUFPO1FBQ0wsaUJBQWlCOztNQUVuQixNQUFNLFNBQVMsT0FBTyxTQUFTLE9BQU8saUJBQWlCO1FBQ3JELE1BQU0sYUFBYSxXQUFXO1VBQzVCLGdCQUFnQjtVQUNoQixJQUFJLE1BQU0sZUFBZTtZQUN2QixNQUFNOzs7Ozs7QUFNbEI7OztBQzNCQTs7Ozs7Ozs7O0FBU0EsUUFBUSxPQUFPO0dBQ1osUUFBUSw0QkFBVSxVQUFVLGVBQWU7Ozs7O0lBSzFDLElBQUksY0FBYyxjQUFjOzs7SUFHaEMsT0FBTztNQUNMLFVBQVUsU0FBUyxJQUFJLE9BQU87UUFDNUIsSUFBSSxZQUFZLElBQUksS0FBSztVQUN2QixRQUFRLE1BQU0sd0NBQXdDO1VBQ3REOztRQUVGLFlBQVksSUFBSSxJQUFJOzs7TUFHdEIsWUFBWSxTQUFTLElBQUk7UUFDdkIsWUFBWSxPQUFPOzs7O01BSXJCLE1BQU0sU0FBUyxJQUFJO1FBQ2pCLElBQUksYUFBYSxZQUFZLElBQUk7UUFDakMsSUFBSSxDQUFDLFlBQVk7VUFDZixRQUFRLE1BQU0sMkJBQTJCO1VBQ3pDOztRQUVGLFdBQVcsU0FBUzs7OztNQUl0QixPQUFPLFNBQVMsSUFBSTtRQUNsQixJQUFJLGFBQWEsWUFBWSxJQUFJO1FBQ2pDLElBQUksQ0FBQyxZQUFZO1VBQ2YsUUFBUSxNQUFNLDJCQUEyQjtVQUN6Qzs7UUFFRixXQUFXLFNBQVM7OztNQUd0QixPQUFPLFdBQVc7UUFDaEIsWUFBWTs7O01BR2QsT0FBTyxXQUFXO1FBQ2hCLE9BQU8sWUFBWSxPQUFPOzs7O0FBSWxDOzs7QUM1REE7Ozs7Ozs7O0FBUUEsUUFBUSxPQUFPO0dBQ1osVUFBVSxPQUFPLFdBQVc7SUFDM0IsT0FBTztNQUNMLGFBQWE7TUFDYixVQUFVO01BQ1YsU0FBUztNQUNULFNBQVM7TUFDVCxZQUFZO01BQ1osT0FBTztRQUNMLFNBQVM7O01BRVgsTUFBTSxTQUFTLE9BQU8sU0FBUyxPQUFPLGtCQUFrQjtRQUN0RCxpQkFBaUIsT0FBTzs7OztBQUloQzs7O0FDeEJBOzs7Ozs7OztBQVFBLFFBQVEsT0FBTztHQUNaLFVBQVUsVUFBVSxXQUFXO0lBQzlCLE9BQU87TUFDTCxhQUFhO01BQ2IsVUFBVTtNQUNWLFlBQVk7OztNQUdaLFlBQVksV0FBVztRQUNyQixJQUFJLE9BQU87O1FBRVgsS0FBSyxPQUFPOztRQUVaLEtBQUssU0FBUyxTQUFTLFVBQVU7O1VBRS9CLFNBQVMsU0FBUyxLQUFLLEtBQUssV0FBVztVQUN2QyxLQUFLLEtBQUssS0FBSzs7O1FBR2pCLEtBQUssVUFBVSxTQUFTLGFBQWE7VUFDbkMsS0FBSyxLQUFLLFFBQVEsU0FBUyxLQUFLOztZQUU5QixJQUFJLFNBQVMsUUFBUTs7Ozs7O01BTTNCLGNBQWM7OztBQUdwQjs7O0FDdkNBOztBQUVBLFFBQVEsT0FBTztHQUNaLFVBQVUsNkhBQVUsU0FBUyxJQUFJLElBQUksSUFBSSxVQUFVLElBQUksU0FBUyxRQUFRLFFBQVEsR0FBRyxXQUFXLFFBQVEsTUFBTSxTQUFTO0lBQ3BILElBQUksVUFBVTtJQUNkLElBQUksa0JBQWtCLE1BQU0sR0FBRyxrQkFBa0IsVUFBVTs7SUFFM0QsSUFBSSxjQUFjLElBQUksS0FBSyxTQUFTLEdBQUcsRUFBRTtRQUNyQyxPQUFPLEVBQUUsV0FBVyxFQUFFOztNQUV4QixZQUFZOztJQUVkLFNBQVMsWUFBWSxPQUFPLFFBQVE7O01BRWxDLElBQUksUUFBUSxtQkFBbUIsU0FBUyxtQkFBbUIsTUFBTSxTQUFTLGlCQUFpQjtRQUN6RixPQUFPOztNQUVULE9BQU87OztJQUdULE9BQU87TUFDTCxhQUFhO01BQ2IsVUFBVTtNQUNWLE9BQU87UUFDTCxPQUFPOzs7UUFHUCxVQUFVO1FBQ1YsVUFBVTs7UUFFVixrQkFBa0I7UUFDbEIsV0FBVztRQUNYLFVBQVU7UUFDVixVQUFVO1FBQ1YsVUFBVTtRQUNWLFVBQVU7UUFDVixTQUFTO1FBQ1QsV0FBVztRQUNYLFNBQVM7O01BRVgsU0FBUztNQUNULE1BQU0sU0FBUyxPQUFPLFNBQVM7UUFDN0IsSUFBSSxnQkFBZ0I7VUFDbEIsa0JBQWtCOztRQUVwQixNQUFNLFNBQVM7UUFDZixNQUFNLGVBQWU7UUFDckIsTUFBTSxpQkFBaUI7UUFDdkIsTUFBTSxhQUFhO1FBQ25CLE1BQU0sZ0JBQWdCO1FBQ3RCLE1BQU0sWUFBWTtRQUNsQixJQUFJLFNBQVMsR0FBRyxPQUFPOztRQUV2QixNQUFNLFlBQVksV0FBVztVQUMzQixNQUFNLGVBQWUsU0FBUyxVQUFVO1lBQ3RDLE9BQU8sZUFBZSxPQUFPLFFBQVEsaUJBQWlCLElBQUksTUFBTSxNQUFNO1lBQ3RFLE1BQU0sYUFBYSxDQUFDLE1BQU07YUFDekI7OztRQUdMLE1BQU0sV0FBVyxXQUFXO1VBQzFCLElBQUksTUFBTSxZQUFZO1lBQ3BCLE9BQU8sZUFBZSxPQUFPLFFBQVEsZ0JBQWdCLElBQUksTUFBTSxNQUFNOzs7VUFHdkUsU0FBUyxPQUFPLE1BQU07VUFDdEIsTUFBTSxhQUFhLE1BQU0sV0FBVzs7O1FBR3RDLFNBQVMsZ0JBQWdCLE9BQU8sTUFBTTtVQUNwQyxJQUFJLENBQUMsUUFBUSxDQUFDLEtBQUssT0FBTyxFQUFFOztVQUU1QixNQUFNLGlCQUFpQixTQUFTLFNBQVMsaUJBQWlCO1lBQ3hELE1BQU0sZ0JBQWdCO1lBQ3RCLE9BQU8sZUFBZSxPQUFPLFFBQVEsZUFBZSxLQUFLOzs7O1lBSXpELE1BQU0sT0FBTyxFQUFFLEtBQUssT0FBTyxLQUFLLFNBQVM7ZUFDdEMsUUFBUTtlQUNSLElBQUksU0FBUyxHQUFHO2dCQUNmLEVBQUUsS0FBSyxHQUFHLFNBQVMsRUFBRSxNQUFNLE9BQU8sRUFBRSxNQUFNLEVBQUU7Z0JBQzVDLE9BQU87O1lBRVgsTUFBTTs7WUFFTixJQUFJLFVBQVUsUUFBUSxLQUFLO2NBQ3pCLFFBQVEsUUFBUSxRQUFRO2NBQ3hCLFFBQVEsUUFBUTtjQUNoQixRQUFRLFFBQVE7OztZQUdsQixJQUFJLE1BQU0sTUFBTSxHQUFHLFNBQVMsTUFBTSxVQUFVO2NBQzFDLFFBQVEsSUFBSSxRQUFRLE1BQU0sTUFBTTttQkFDM0I7Y0FDTCxRQUFRLElBQUksUUFBUSxNQUFNLE1BQU0sR0FBRzs7OztZQUlyQyxJQUFJLE1BQU0sTUFBTSxJQUFJLFFBQVEsTUFBTSxTQUFTO2NBQ3pDLFFBQVEsSUFBSSxTQUFTLE1BQU0sTUFBTTttQkFDNUI7Y0FDTCxRQUFRLElBQUksU0FBUyxNQUFNLE1BQU0sR0FBRzs7YUFFckM7OztRQUdMLFNBQVMsZUFBZSxPQUFPLE1BQU07O1VBRW5DLElBQUksVUFBVSxRQUFRLEtBQUs7VUFDM0IsUUFBUSxJQUFJLE9BQU87VUFDbkIsUUFBUSxJQUFJLFFBQVE7VUFDcEIsU0FBUyxPQUFPLE1BQU07VUFDdEIsSUFBSSxNQUFNLGVBQWU7WUFDdkIsT0FBTyxlQUFlLE9BQU8sUUFBUSxtQkFBbUIsS0FBSzs7VUFFL0QsTUFBTSxnQkFBZ0I7VUFDdEIsTUFBTSxPQUFPO1VBQ2IsTUFBTTs7O1FBR1IsU0FBUyxZQUFZO1VBQ25CLElBQUksWUFBWSxNQUFNLGFBQWEsT0FBTyxvQkFBb0I7O1VBRTlELElBQUksQ0FBQyxNQUFNLE1BQU0sUUFBUTs7VUFFekIsSUFBSSxTQUFTLEVBQUUsVUFBVSxNQUFNLE1BQU07VUFDckMsR0FBRyxPQUFPLE9BQU8sUUFBUSxPQUFPOzs7VUFHaEMsSUFBSSxRQUFRLE1BQU0sTUFBTSxTQUFTLFFBQVE7O1VBRXpDLE9BQU8sR0FBRyxRQUFRLFFBQVE7OztRQUc1QixTQUFTLGtCQUFrQjtVQUN6QixJQUFJLE1BQU0sU0FBUztZQUNqQixJQUFJLFNBQVMsTUFBTSxXQUFXLEtBQUssTUFBTSxXQUFXLE1BQU0sUUFBUTtZQUNsRSxJQUFJLFNBQVMsTUFBTSxZQUFZLElBQUksTUFBTSxZQUFZLE1BQU0sVUFBVTtZQUNyRSxJQUFJLFFBQVEsS0FBSyxJQUFJLFFBQVE7O1lBRTdCLElBQUksWUFBWTtZQUNoQixPQUFPLE9BQU8sV0FBVyxPQUFPO2NBQzlCLGFBQWE7OztZQUdmLElBQUksSUFBSSxZQUFZLE1BQU0sS0FBSztZQUMvQixRQUFRLEtBQUssU0FBUyxJQUFJLGFBQWEsY0FBYyxFQUFFLE9BQU8sRUFBRSxZQUFZLFVBQVU7aUJBQ2pGO1lBQ0wsUUFBUSxLQUFLLFNBQVMsSUFBSSxhQUFhOzs7O1FBSTNDLFNBQVMsZUFBZTtVQUN0QixPQUFPLE1BQU0sTUFBTSxjQUFjLE1BQU0sTUFBTSxTQUFTLEdBQUcsU0FBUyxVQUFVLE1BQU0sTUFBTSxVQUFVOzs7UUFHcEcsU0FBUyxrQkFBa0I7O1VBRXpCLElBQUksWUFBWSxTQUFTLEdBQUc7WUFDMUIsSUFBSSxPQUFPLFlBQVk7WUFDdkIsS0FBSztpQkFDQTs7WUFFTCxZQUFZOzs7O1FBSWhCLFNBQVMsT0FBTyxNQUFNO1VBQ3BCLElBQUksQ0FBQyxNQUFNO1lBQ1QsSUFBSSxNQUFNO2NBQ1IsS0FBSyxJQUFJO2NBQ1QsS0FBSyxJQUFJOztZQUVYOzs7VUFHRixNQUFNLFNBQVMsS0FBSztVQUNwQixJQUFJLENBQUMsU0FBUztZQUNaLFFBQVEsTUFBTTs7O1VBR2hCLElBQUksWUFBWTs7VUFFaEIsTUFBTSxXQUFXLFlBQVk7O1VBRTdCLFNBQVMsWUFBWTs7WUFFbkIsSUFBSSxNQUFNLGFBQWEsTUFBTSxhQUFhLE1BQU0sWUFBWSxNQUFNLE1BQU0sZUFBZSxDQUFDLE1BQU0sU0FBUyxNQUFNLE1BQU0sZUFBZTtjQUNoSSxRQUFRLElBQUksb0JBQW9CO2NBQ2hDO2NBQ0E7OztZQUdGLElBQUksUUFBUSxJQUFJLE9BQU87O1lBRXZCLEdBQUcsTUFBTSxLQUFLLE1BQU0sU0FBUyxPQUFPO2NBQ2xDLElBQUk7Z0JBQ0YsSUFBSSxXQUFXLElBQUksT0FBTztnQkFDMUIsT0FBTztnQkFDUCxPQUFPLE1BQU0sQ0FBQyxJQUFJLFFBQVE7O2dCQUUxQixJQUFJLENBQUMsT0FBTyxRQUFRO2tCQUNsQixLQUFLLEtBQUssQ0FBQyxLQUFLLFFBQVE7OztnQkFHMUIsTUFBTSxTQUFTLEtBQUs7Z0JBQ3BCLE1BQU0sU0FBUyxLQUFLO2dCQUNwQixLQUFLLFNBQVMsWUFBWSxLQUFLLE9BQU8sTUFBTTtnQkFDNUMsS0FBSzs7Z0JBRUwsSUFBSSxPQUFPLE9BQU87a0JBQ2hCLFFBQVEsUUFBUSxRQUFRLFNBQVM7a0JBQ2pDLFFBQVEsTUFBTSxhQUFhOzs7Z0JBRzdCLE9BQU8sZUFBZSxPQUFPLFFBQVEsY0FBYyxJQUFJLE1BQU0sTUFBTTtrQkFDakU7O2dCQUVGLElBQUksV0FBVyxJQUFJLE9BQU87Z0JBQzFCLFFBQVEsSUFBSSxlQUFlLFNBQVMsUUFBUSxhQUFhLFNBQVMsV0FBVztnQkFDN0UsSUFBSSxNQUFNLFNBQVM7a0JBQ2pCLEtBQUssR0FBRyxhQUFhO2tCQUNyQixLQUFLLEdBQUcsWUFBWTs7Z0JBRXRCLE9BQU8sR0FBRztnQkFDVixRQUFRLE1BQU07d0JBQ047Z0JBQ1I7Ozs7OztVQU1OLElBQUksQ0FBQyxXQUFXO1lBQ2QsVUFBVTtZQUNWO2lCQUNLOztZQUVMLFlBQVksS0FBSztjQUNmLFVBQVUsTUFBTSxZQUFZO2NBQzVCLE9BQU87Ozs7O1FBS2IsSUFBSTtRQUNKLE1BQU0sT0FBTyxXQUFXOztVQUV0QixPQUFPLEVBQUUsS0FBSyxNQUFNLE1BQU0sUUFBUTtXQUNqQyxXQUFXO1VBQ1osSUFBSSxPQUFPLE1BQU0sTUFBTSxTQUFTO1VBQ2hDLElBQUksQ0FBQyxNQUFNLE1BQU0sV0FBVztZQUMxQixNQUFNLE1BQU0sWUFBWSxHQUFHLFNBQVMsU0FBUyxNQUFNLE1BQU0sUUFBUSxPQUFPOztVQUUxRSxPQUFPO1dBQ047O1FBRUgsTUFBTSxJQUFJLFlBQVksV0FBVztVQUMvQixRQUFRLElBQUk7VUFDWixJQUFJLE1BQU07WUFDUixLQUFLLElBQUk7WUFDVCxLQUFLLElBQUk7WUFDVCxPQUFPOztVQUVULElBQUksWUFBWTtVQUNoQixJQUFJLE9BQU8sU0FBUyxRQUFRLE9BQU87WUFDakMsT0FBTyxRQUFRLE1BQU07OztVQUd2QixNQUFNLFlBQVk7Ozs7Ozs7OztBQVM1Qjs7O0FDdlJBOzs7Ozs7OztBQVFBLFFBQVEsT0FBTztHQUNaLFVBQVUsNkVBQWUsVUFBVSxXQUFXLFFBQVEsSUFBSSxJQUFJLFNBQVMsUUFBUSxHQUFHO0lBQ2pGLE9BQU87TUFDTCxhQUFhO01BQ2IsVUFBVTtNQUNWLFNBQVM7TUFDVCxtQ0FBWSxTQUFTLFFBQVEsVUFBVTtRQUNyQyxLQUFLLGdCQUFnQixXQUFXO1VBQzlCLE9BQU8sU0FBUyxLQUFLLGNBQWM7OztNQUd2QyxPQUFPOztRQUVMLE9BQU87OztRQUdQLFVBQVU7UUFDVixVQUFVOztRQUVWLGtCQUFrQjtRQUNsQixXQUFXO1FBQ1gsV0FBVztRQUNYLFVBQVU7UUFDVixVQUFVO1FBQ1YsVUFBVTtRQUNWLFNBQVM7UUFDVCxXQUFXO1FBQ1gsU0FBUzs7OztRQUlULFVBQVU7O1FBRVYsY0FBYztRQUNkLFdBQVc7UUFDWCxZQUFZO1FBQ1osZ0JBQWdCO1FBQ2hCLFdBQVc7UUFDWCxTQUFTO1FBQ1QsY0FBYztRQUNkLFVBQVU7UUFDVixlQUFlOztRQUVmLGdCQUFnQjtRQUNoQixZQUFZO1FBQ1osYUFBYTtRQUNiLGNBQWM7O01BRWhCLE1BQU0sU0FBUyxTQUFTLE9BQU87UUFDN0IsTUFBTSxZQUFZO1FBQ2xCLE1BQU0sU0FBUztRQUNmLE1BQU0sVUFBVTs7O1FBR2hCLE1BQU0sY0FBYzs7UUFFcEIsTUFBTSxrQkFBa0IsRUFBRSxLQUFLLFdBQVc7VUFDeEMsTUFBTSxjQUFjOzs7UUFHdEIsTUFBTSxVQUFVLFNBQVMsTUFBTSxPQUFPO1VBQ3BDLFFBQVEsSUFBSSxLQUFLLFNBQVMsS0FBSyxVQUFVOzs7OztRQUszQyxNQUFNLE1BQU07UUFDWixNQUFNLElBQUksVUFBVSxTQUFTLE1BQU0sU0FBUztVQUMxQyxJQUFJLENBQUMsTUFBTSxFQUFFLE9BQU87VUFDcEIsSUFBSSxXQUFXLEtBQUs7WUFDbEIsUUFBUSxTQUFTOztVQUVuQixPQUFPLFNBQVMsTUFBTSxRQUFRLE9BQU8sQ0FBQyxNQUFNOzs7UUFHOUMsTUFBTSxJQUFJLFNBQVMsU0FBUyxNQUFNLFNBQVM7VUFDekMsSUFBSSxDQUFDLE1BQU0sSUFBSSxRQUFRLE1BQU0sVUFBVSxFQUFFOztVQUV6QyxJQUFJLFFBQVEsS0FBSyxTQUFTO1lBQ3hCLFFBQVEsTUFBTSxRQUFRLE1BQU0sU0FBUzs7VUFFdkMsTUFBTSxPQUFPLE1BQU0sU0FBUyxRQUFRLFdBQVc7VUFDL0MsT0FBTyxlQUFlLE9BQU8sUUFBUSxZQUFZLE1BQU0sTUFBTTs7UUFFL0QsTUFBTSxJQUFJLFNBQVMsU0FBUyxNQUFNLFNBQVM7VUFDekMsSUFBSSxDQUFDLE1BQU0sSUFBSSxRQUFRLE1BQU0sVUFBVSxFQUFFOztVQUV6QyxJQUFJLFFBQVEsS0FBSyxTQUFTO1lBQ3hCLFFBQVEsTUFBTSxRQUFRLE1BQU0sU0FBUzs7VUFFdkMsT0FBTyxNQUFNLFNBQVM7Ozs7OztRQU14QixNQUFNLG1CQUFtQixTQUFTLE1BQU07VUFDdEMsT0FBTyxlQUFlLE9BQU8sUUFBUSxvQkFBb0IsTUFBTSxNQUFNOztVQUVyRSxLQUFLLFNBQVMsS0FBSyxVQUFVO1VBQzdCLEtBQUssT0FBTyxhQUFhLEtBQUssT0FBTyxjQUFjOztZQUVqRCxHQUFHO1lBQ0gsR0FBRztZQUNILEdBQUc7WUFDSCxHQUFHOztVQUVMLEtBQUssT0FBTyxXQUFXLElBQUksQ0FBQyxLQUFLLE9BQU8sV0FBVztVQUNuRCxLQUFLLE9BQU8sV0FBVyxJQUFJLENBQUMsS0FBSyxPQUFPLFdBQVc7OztRQUdyRCxNQUFNLGlCQUFpQixVQUFVLFNBQVMsTUFBTSxPQUFPO1VBQ3JELElBQUksU0FBUyxHQUFHLElBQUksT0FBTyxLQUFLO1VBQ2hDLEtBQUssSUFBSSxhQUFhLFFBQVE7WUFDNUIsSUFBSSxZQUFZLE9BQU87WUFDdkI7Z0JBQ0ksQ0FBQyxVQUFVLGFBQWEsS0FBSyxVQUFVLGFBQWE7aUJBQ25ELGFBQWE7Z0JBQ2QsTUFBTSxXQUFXLFVBQVU7Z0JBQzNCO2NBQ0YsT0FBTzs7O1VBR1gsT0FBTzs7Ozs7O1FBTVQsSUFBSSxhQUFhLE1BQU0sYUFBYTs7UUFFcEMsV0FBVyxRQUFRLENBQUMscUJBQXFCO1VBQ3ZDLDBCQUEwQiwyQkFBMkI7O1FBRXZELFdBQVcsU0FBUyxTQUFTLE1BQU07VUFDakMsT0FBTyxlQUFlLE9BQU8sUUFBUSxhQUFhLE1BQU0sTUFBTTtVQUM5RCxJQUFJLGNBQWMsV0FBVyxLQUFLO1VBQ2xDLElBQUksbUJBQW1CLFdBQVcsTUFBTSxRQUFROztVQUVoRCxJQUFJLGVBQWUsQ0FBQyxtQkFBbUIsTUFBTSxXQUFXLE1BQU0sU0FBUztVQUN2RSxJQUFJLFVBQVUsV0FBVyxNQUFNOztVQUUvQixRQUFRLElBQUksY0FBYyxhQUFhOztVQUV2QyxJQUFJLFdBQVcsV0FBVyxTQUFTO1VBQ25DLEtBQUssU0FBUyxTQUFTLFNBQVMsT0FBTyxXQUFXLFFBQVEsU0FBUzs7OztRQUlyRSxXQUFXLFVBQVUsU0FBUyxNQUFNLE1BQU07VUFDeEMsSUFBSSxTQUFTLHFCQUFxQjtZQUNoQyxPQUFPOzs7VUFHVCxJQUFJLFNBQVMsc0JBQXNCO1lBQ2pDLE9BQU87OztVQUdULElBQUksV0FBVyxXQUFXLFNBQVM7VUFDbkMsSUFBSSxVQUFVLEtBQUssU0FBUyxTQUFTOztVQUVyQyxJQUFJLFNBQVMsMEJBQTBCO1lBQ3JDLE9BQU87Y0FDTCxJQUFJLFFBQVE7Y0FDWixPQUFPLFFBQVE7Y0FDZixPQUFPOzs7O1VBSVgsSUFBSSxTQUFTLDJCQUEyQjtZQUN0QyxPQUFPO2NBQ0wsSUFBSSxRQUFRO2NBQ1osT0FBTyxRQUFRO2NBQ2YsT0FBTzs7OztVQUlYLE9BQU87OztRQUdULFdBQVcsT0FBTyxTQUFTLE1BQU07VUFDL0IsSUFBSSxXQUFXLFdBQVcsU0FBUztVQUNuQyxJQUFJLE9BQU8sS0FBSyxTQUFTLFNBQVMsU0FBUzs7VUFFM0MsSUFBSSxTQUFTLFdBQVc7WUFDdEIsT0FBTzs7O1VBR1QsS0FBSyxJQUFJLElBQUksR0FBRyxJQUFJLFdBQVcsTUFBTSxTQUFTLElBQUksS0FBSzs7WUFFckQsSUFBSSxPQUFPLFdBQVcsTUFBTTtZQUM1QixJQUFJLGFBQWEsV0FBVyxRQUFRLE1BQU07O1lBRTFDLElBQUksRUFBRSxRQUFRLE1BQU0sYUFBYTtjQUMvQixPQUFPOzs7O1VBSVgsSUFBSSxHQUFHLFNBQVMsU0FBUyxLQUFLLE1BQU0sS0FBSyxPQUFPO1lBQzlDLE9BQU87O1VBRVQsUUFBUSxNQUFNO1VBQ2QsT0FBTzs7O1FBR1QsV0FBVyxXQUFXLFNBQVMsTUFBTTtVQUNuQyxPQUFPLEtBQUssU0FBUyxFQUFFLFNBQVMsT0FBTyxLQUFLLFNBQVMsRUFBRSxTQUFTO2tCQUN4RCxDQUFDLFNBQVMsS0FBSyxjQUFjO2tCQUM3QixDQUFDLFNBQVMsS0FBSyxjQUFjOzs7UUFHdkMsV0FBVyxVQUFVLFNBQVMsTUFBTSxPQUFPO1VBQ3pDLElBQUksTUFBTSxLQUFLOztVQUVmLElBQUksR0FBRyxJQUFJLElBQUksS0FBSyxVQUFVLEdBQUcsSUFBSSxJQUFJLEtBQUs7WUFDNUMsQ0FBQyxHQUFHLElBQUksSUFBSSxLQUFLLFFBQVEsQ0FBQyxHQUFHLElBQUksSUFBSSxLQUFLO1lBQzFDLENBQUMsR0FBRyxTQUFTLGtCQUFrQixNQUFNLFFBQVE7WUFDN0MsT0FBTzs7O1VBR1QsT0FBTyxFQUFFLEdBQUcsT0FBTyxRQUFRLElBQUksR0FBRyxDQUFDLEtBQUssU0FBUyxHQUFHLE9BQU8sVUFBVSxJQUFJLE1BQU07WUFDN0UsRUFBRSxHQUFHLE9BQU8sUUFBUSxJQUFJLEdBQUcsQ0FBQyxJQUFJLFNBQVMsR0FBRyxPQUFPLFVBQVUsSUFBSSxNQUFNLE1BQU07OztRQUdqRixNQUFNLGtCQUFrQixTQUFTLFFBQVE7VUFDdkMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxXQUFXLFFBQVEsUUFBUSxRQUFRLFFBQVE7WUFDekQsT0FBTzs7O1VBR1QsSUFBSSxpQkFBaUIsVUFBVSxXQUFXLFNBQVMsUUFBUTtZQUN6RCxPQUFPLFVBQVUsV0FBVyxLQUFLOztVQUVuQyxJQUFJLGlCQUFpQixtQkFBbUIsTUFBTSxZQUFZOztVQUUxRCxRQUFRO1lBQ04sS0FBSztjQUNILE9BQU8saUJBQWlCO1lBQzFCLEtBQUs7Y0FDSCxPQUFPLGlCQUFpQjtZQUMxQixLQUFLO2NBQ0gsT0FBTyxpQkFBaUI7WUFDMUIsS0FBSztjQUNILE9BQU8saUJBQWlCO1lBQzFCO2NBQ0UsT0FBTyxpQkFBaUI7Ozs7UUFJOUIsTUFBTSxZQUFZLFdBQVc7VUFDM0IsT0FBTyxlQUFlLE9BQU8sUUFBUSxrQkFBa0IsTUFBTSxNQUFNO1VBQ25FLEdBQUcsU0FBUyxVQUFVLE1BQU0sTUFBTTs7O1FBR3BDLE1BQU0sSUFBSSxZQUFZLFdBQVc7VUFDL0IsTUFBTSxRQUFROzs7OztBQUt4Qjs7O0FDM1FBOzs7Ozs7OztBQVFBLFFBQVEsT0FBTztHQUNaLFVBQVUsNkJBQW9CLFVBQVUsTUFBTTtJQUM3QyxPQUFPO01BQ0wsYUFBYTtNQUNiLFVBQVU7TUFDVixTQUFTO01BQ1QsT0FBTztNQUNQLE1BQU0sU0FBUyxTQUFTLE9BQU8sU0FBUyxPQUFPLHVCQUF1QjtRQUNwRSxJQUFJLGFBQWEsSUFBSSxLQUFLO1VBQ3hCLFNBQVMsUUFBUSxLQUFLLGFBQWE7VUFDbkMsUUFBUSxzQkFBc0I7VUFDOUIsVUFBVTtVQUNWLFFBQVE7VUFDUixtQkFBbUI7OztRQUdyQixNQUFNLElBQUksWUFBWSxXQUFXO1VBQy9CLFdBQVc7Ozs7O0FBS3JCOzs7QUM5QkE7O0FBRUEsUUFBUSxPQUFPO0dBQ1osT0FBTyx5QkFBZSxTQUFTLE9BQU87SUFDckMsT0FBTyxTQUFTLE9BQU87TUFDckIsT0FBTyxNQUFNLFVBQVUsT0FBTyxNQUFNLE1BQU07OztBQUdoRDs7O0FDUkE7Ozs7Ozs7Ozs7QUFVQSxRQUFRLE9BQU87R0FDWixPQUFPLGtEQUFhLFVBQVUsbUJBQW1CLEdBQUcsUUFBUTtJQUMzRCxTQUFTLGNBQWMsUUFBUTtNQUM3QixJQUFJLE1BQU07O01BRVYsSUFBSSxPQUFPLFFBQVE7UUFDakIsSUFBSSxRQUFRLFVBQVUsa0JBQWtCLEVBQUUsT0FBTyxPQUFPO1FBQ3hELE9BQU8sc0JBQXNCLFFBQVE7OztNQUd2QyxJQUFJLE9BQU8sVUFBVTtRQUNuQixJQUFJLFdBQVcsRUFBRSxLQUFLLE9BQU8sVUFBVTtRQUN2QyxXQUFXLFVBQVUsa0JBQWtCO1FBQ3ZDLE9BQU8sc0JBQXNCLFdBQVc7OztNQUcxQyxJQUFJLE9BQU8sV0FBVztRQUNwQixJQUFJLFlBQVksRUFBRSxLQUFLLE9BQU8sV0FBVztRQUN6QyxZQUFZLFVBQVUsa0JBQWtCO1FBQ3hDLE9BQU8scUJBQXFCLFlBQVk7OztNQUcxQyxJQUFJLFdBQVc7TUFDZixRQUFRLE9BQU87UUFDYixLQUFLO1VBQ0gsT0FBTyxXQUFXO1VBQ2xCO1FBQ0YsS0FBSztVQUNILE9BQU8sV0FBVztVQUNsQjtRQUNGLEtBQUs7VUFDSCxPQUFPLFdBQVc7VUFDbEI7OztNQUdKLE9BQU87OztJQUdULFNBQVMsV0FBVyxRQUFRO01BQzFCLElBQUksTUFBTTtNQUNWLElBQUksT0FBTyxVQUFVO1FBQ25CLElBQUksV0FBVyxFQUFFLEtBQUssT0FBTyxVQUFVO1FBQ3ZDLFdBQVcsVUFBVSxrQkFBa0I7UUFDdkMsT0FBTyxzQkFBc0IsV0FBVzs7TUFFMUMsT0FBTzs7O0lBR1QsT0FBTyxPQUFPLFVBQVUsWUFBWSxnQkFBZ0I7TUFDbkQ7Ozs7QUMzREw7Ozs7Ozs7Ozs7QUFVQSxRQUFRLE9BQU87R0FDWixPQUFPLGFBQWEsWUFBWTtJQUMvQixPQUFPLFVBQVUsT0FBTztNQUN0QixPQUFPLE9BQU8sVUFBVTs7S0FFekI7Ozs7QUNmTDs7QUFFQSxRQUFRLE9BQU87R0FDWixPQUFPLGFBQWEsV0FBVztJQUM5QixPQUFPLFNBQVMsT0FBTztNQUNyQixJQUFJLGFBQWE7UUFDZixHQUFHO1FBQ0gsR0FBRztRQUNILEdBQUc7UUFDSCxHQUFHOzs7TUFHTCxPQUFPLFdBQVc7OztBQUd4Qjs7O0FDZkE7Ozs7Ozs7Ozs7QUFVQSxRQUFRLE9BQU87R0FDWixPQUFPLG9CQUFvQixZQUFZO0lBQ3RDLE9BQU8sVUFBVSxPQUFPO01BQ3RCLE9BQU8sUUFBUSxNQUFNLFFBQVEsT0FBTyxPQUFPOztLQUU1QyIsImZpbGUiOiJ2bHVpLmpzIiwic291cmNlc0NvbnRlbnQiOlsiLyohXG4gKiBKU09OMyB3aXRoIGNvbXBhY3Qgc3RyaW5naWZ5IC0tIE1vZGlmaWVkIGJ5IEthbml0IFdvbmdzdXBoYXNhd2F0LiAgIGh0dHBzOi8vZ2l0aHViLmNvbS9rYW5pdHcvanNvbjNcbiAqXG4gKiBGb3JrZWQgZnJvbSBKU09OIHYzLjMuMiB8IGh0dHBzOi8vYmVzdGllanMuZ2l0aHViLmlvL2pzb24zIHwgQ29weXJpZ2h0IDIwMTItMjAxNCwgS2l0IENhbWJyaWRnZSB8IGh0dHA6Ly9raXQubWl0LWxpY2Vuc2Uub3JnXG4gKi9cbjsoZnVuY3Rpb24gKCkge1xuICAvLyBEZXRlY3QgdGhlIGBkZWZpbmVgIGZ1bmN0aW9uIGV4cG9zZWQgYnkgYXN5bmNocm9ub3VzIG1vZHVsZSBsb2FkZXJzLiBUaGVcbiAgLy8gc3RyaWN0IGBkZWZpbmVgIGNoZWNrIGlzIG5lY2Vzc2FyeSBmb3IgY29tcGF0aWJpbGl0eSB3aXRoIGByLmpzYC5cbiAgdmFyIGlzTG9hZGVyID0gdHlwZW9mIGRlZmluZSA9PT0gXCJmdW5jdGlvblwiICYmIGRlZmluZS5hbWQ7XG5cbiAgLy8gQSBzZXQgb2YgdHlwZXMgdXNlZCB0byBkaXN0aW5ndWlzaCBvYmplY3RzIGZyb20gcHJpbWl0aXZlcy5cbiAgdmFyIG9iamVjdFR5cGVzID0ge1xuICAgIFwiZnVuY3Rpb25cIjogdHJ1ZSxcbiAgICBcIm9iamVjdFwiOiB0cnVlXG4gIH07XG5cbiAgLy8gRGV0ZWN0IHRoZSBgZXhwb3J0c2Agb2JqZWN0IGV4cG9zZWQgYnkgQ29tbW9uSlMgaW1wbGVtZW50YXRpb25zLlxuICB2YXIgZnJlZUV4cG9ydHMgPSBvYmplY3RUeXBlc1t0eXBlb2YgZXhwb3J0c10gJiYgZXhwb3J0cyAmJiAhZXhwb3J0cy5ub2RlVHlwZSAmJiBleHBvcnRzO1xuXG4gIC8vIFVzZSB0aGUgYGdsb2JhbGAgb2JqZWN0IGV4cG9zZWQgYnkgTm9kZSAoaW5jbHVkaW5nIEJyb3dzZXJpZnkgdmlhXG4gIC8vIGBpbnNlcnQtbW9kdWxlLWdsb2JhbHNgKSwgTmFyd2hhbCwgYW5kIFJpbmdvIGFzIHRoZSBkZWZhdWx0IGNvbnRleHQsXG4gIC8vIGFuZCB0aGUgYHdpbmRvd2Agb2JqZWN0IGluIGJyb3dzZXJzLiBSaGlubyBleHBvcnRzIGEgYGdsb2JhbGAgZnVuY3Rpb25cbiAgLy8gaW5zdGVhZC5cbiAgdmFyIHJvb3QgPSBvYmplY3RUeXBlc1t0eXBlb2Ygd2luZG93XSAmJiB3aW5kb3cgfHwgdGhpcyxcbiAgICAgIGZyZWVHbG9iYWwgPSBmcmVlRXhwb3J0cyAmJiBvYmplY3RUeXBlc1t0eXBlb2YgbW9kdWxlXSAmJiBtb2R1bGUgJiYgIW1vZHVsZS5ub2RlVHlwZSAmJiB0eXBlb2YgZ2xvYmFsID09IFwib2JqZWN0XCIgJiYgZ2xvYmFsO1xuXG4gIGlmIChmcmVlR2xvYmFsICYmIChmcmVlR2xvYmFsW1wiZ2xvYmFsXCJdID09PSBmcmVlR2xvYmFsIHx8IGZyZWVHbG9iYWxbXCJ3aW5kb3dcIl0gPT09IGZyZWVHbG9iYWwgfHwgZnJlZUdsb2JhbFtcInNlbGZcIl0gPT09IGZyZWVHbG9iYWwpKSB7XG4gICAgcm9vdCA9IGZyZWVHbG9iYWw7XG4gIH1cblxuICAvLyBQdWJsaWM6IEluaXRpYWxpemVzIEpTT04gMyB1c2luZyB0aGUgZ2l2ZW4gYGNvbnRleHRgIG9iamVjdCwgYXR0YWNoaW5nIHRoZVxuICAvLyBgc3RyaW5naWZ5YCBhbmQgYHBhcnNlYCBmdW5jdGlvbnMgdG8gdGhlIHNwZWNpZmllZCBgZXhwb3J0c2Agb2JqZWN0LlxuICBmdW5jdGlvbiBydW5JbkNvbnRleHQoY29udGV4dCwgZXhwb3J0cykge1xuICAgIGNvbnRleHQgfHwgKGNvbnRleHQgPSByb290W1wiT2JqZWN0XCJdKCkpO1xuICAgIGV4cG9ydHMgfHwgKGV4cG9ydHMgPSByb290W1wiT2JqZWN0XCJdKCkpO1xuXG4gICAgLy8gTmF0aXZlIGNvbnN0cnVjdG9yIGFsaWFzZXMuXG4gICAgdmFyIE51bWJlciA9IGNvbnRleHRbXCJOdW1iZXJcIl0gfHwgcm9vdFtcIk51bWJlclwiXSxcbiAgICAgICAgU3RyaW5nID0gY29udGV4dFtcIlN0cmluZ1wiXSB8fCByb290W1wiU3RyaW5nXCJdLFxuICAgICAgICBPYmplY3QgPSBjb250ZXh0W1wiT2JqZWN0XCJdIHx8IHJvb3RbXCJPYmplY3RcIl0sXG4gICAgICAgIERhdGUgPSBjb250ZXh0W1wiRGF0ZVwiXSB8fCByb290W1wiRGF0ZVwiXSxcbiAgICAgICAgU3ludGF4RXJyb3IgPSBjb250ZXh0W1wiU3ludGF4RXJyb3JcIl0gfHwgcm9vdFtcIlN5bnRheEVycm9yXCJdLFxuICAgICAgICBUeXBlRXJyb3IgPSBjb250ZXh0W1wiVHlwZUVycm9yXCJdIHx8IHJvb3RbXCJUeXBlRXJyb3JcIl0sXG4gICAgICAgIE1hdGggPSBjb250ZXh0W1wiTWF0aFwiXSB8fCByb290W1wiTWF0aFwiXSxcbiAgICAgICAgbmF0aXZlSlNPTiA9IGNvbnRleHRbXCJKU09OXCJdIHx8IHJvb3RbXCJKU09OXCJdO1xuXG4gICAgLy8gRGVsZWdhdGUgdG8gdGhlIG5hdGl2ZSBgc3RyaW5naWZ5YCBhbmQgYHBhcnNlYCBpbXBsZW1lbnRhdGlvbnMuXG4gICAgaWYgKHR5cGVvZiBuYXRpdmVKU09OID09IFwib2JqZWN0XCIgJiYgbmF0aXZlSlNPTikge1xuICAgICAgZXhwb3J0cy5zdHJpbmdpZnkgPSBuYXRpdmVKU09OLnN0cmluZ2lmeTtcbiAgICAgIGV4cG9ydHMucGFyc2UgPSBuYXRpdmVKU09OLnBhcnNlO1xuICAgIH1cblxuICAgIC8vIENvbnZlbmllbmNlIGFsaWFzZXMuXG4gICAgdmFyIG9iamVjdFByb3RvID0gT2JqZWN0LnByb3RvdHlwZSxcbiAgICAgICAgZ2V0Q2xhc3MgPSBvYmplY3RQcm90by50b1N0cmluZyxcbiAgICAgICAgaXNQcm9wZXJ0eSwgZm9yRWFjaCwgdW5kZWY7XG5cbiAgICAvLyBUZXN0IHRoZSBgRGF0ZSNnZXRVVEMqYCBtZXRob2RzLiBCYXNlZCBvbiB3b3JrIGJ5IEBZYWZmbGUuXG4gICAgdmFyIGlzRXh0ZW5kZWQgPSBuZXcgRGF0ZSgtMzUwOTgyNzMzNDU3MzI5Mik7XG4gICAgdHJ5IHtcbiAgICAgIC8vIFRoZSBgZ2V0VVRDRnVsbFllYXJgLCBgTW9udGhgLCBhbmQgYERhdGVgIG1ldGhvZHMgcmV0dXJuIG5vbnNlbnNpY2FsXG4gICAgICAvLyByZXN1bHRzIGZvciBjZXJ0YWluIGRhdGVzIGluIE9wZXJhID49IDEwLjUzLlxuICAgICAgaXNFeHRlbmRlZCA9IGlzRXh0ZW5kZWQuZ2V0VVRDRnVsbFllYXIoKSA9PSAtMTA5MjUyICYmIGlzRXh0ZW5kZWQuZ2V0VVRDTW9udGgoKSA9PT0gMCAmJiBpc0V4dGVuZGVkLmdldFVUQ0RhdGUoKSA9PT0gMSAmJlxuICAgICAgICAvLyBTYWZhcmkgPCAyLjAuMiBzdG9yZXMgdGhlIGludGVybmFsIG1pbGxpc2Vjb25kIHRpbWUgdmFsdWUgY29ycmVjdGx5LFxuICAgICAgICAvLyBidXQgY2xpcHMgdGhlIHZhbHVlcyByZXR1cm5lZCBieSB0aGUgZGF0ZSBtZXRob2RzIHRvIHRoZSByYW5nZSBvZlxuICAgICAgICAvLyBzaWduZWQgMzItYml0IGludGVnZXJzIChbLTIgKiogMzEsIDIgKiogMzEgLSAxXSkuXG4gICAgICAgIGlzRXh0ZW5kZWQuZ2V0VVRDSG91cnMoKSA9PSAxMCAmJiBpc0V4dGVuZGVkLmdldFVUQ01pbnV0ZXMoKSA9PSAzNyAmJiBpc0V4dGVuZGVkLmdldFVUQ1NlY29uZHMoKSA9PSA2ICYmIGlzRXh0ZW5kZWQuZ2V0VVRDTWlsbGlzZWNvbmRzKCkgPT0gNzA4O1xuICAgIH0gY2F0Y2ggKGV4Y2VwdGlvbikge31cblxuICAgIC8vIEludGVybmFsOiBEZXRlcm1pbmVzIHdoZXRoZXIgdGhlIG5hdGl2ZSBgSlNPTi5zdHJpbmdpZnlgIGFuZCBgcGFyc2VgXG4gICAgLy8gaW1wbGVtZW50YXRpb25zIGFyZSBzcGVjLWNvbXBsaWFudC4gQmFzZWQgb24gd29yayBieSBLZW4gU255ZGVyLlxuICAgIGZ1bmN0aW9uIGhhcyhuYW1lKSB7XG4gICAgICBpZiAoaGFzW25hbWVdICE9PSB1bmRlZikge1xuICAgICAgICAvLyBSZXR1cm4gY2FjaGVkIGZlYXR1cmUgdGVzdCByZXN1bHQuXG4gICAgICAgIHJldHVybiBoYXNbbmFtZV07XG4gICAgICB9XG4gICAgICB2YXIgaXNTdXBwb3J0ZWQ7XG4gICAgICBpZiAobmFtZSA9PSBcImJ1Zy1zdHJpbmctY2hhci1pbmRleFwiKSB7XG4gICAgICAgIC8vIElFIDw9IDcgZG9lc24ndCBzdXBwb3J0IGFjY2Vzc2luZyBzdHJpbmcgY2hhcmFjdGVycyB1c2luZyBzcXVhcmVcbiAgICAgICAgLy8gYnJhY2tldCBub3RhdGlvbi4gSUUgOCBvbmx5IHN1cHBvcnRzIHRoaXMgZm9yIHByaW1pdGl2ZXMuXG4gICAgICAgIGlzU3VwcG9ydGVkID0gXCJhXCJbMF0gIT0gXCJhXCI7XG4gICAgICB9IGVsc2UgaWYgKG5hbWUgPT0gXCJqc29uXCIpIHtcbiAgICAgICAgLy8gSW5kaWNhdGVzIHdoZXRoZXIgYm90aCBgSlNPTi5zdHJpbmdpZnlgIGFuZCBgSlNPTi5wYXJzZWAgYXJlXG4gICAgICAgIC8vIHN1cHBvcnRlZC5cbiAgICAgICAgaXNTdXBwb3J0ZWQgPSBoYXMoXCJqc29uLXN0cmluZ2lmeVwiKSAmJiBoYXMoXCJqc29uLXBhcnNlXCIpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdmFyIHZhbHVlLCBzZXJpYWxpemVkID0gJ3tcImFcIjpbMSx0cnVlLGZhbHNlLG51bGwsXCJcXFxcdTAwMDBcXFxcYlxcXFxuXFxcXGZcXFxcclxcXFx0XCJdfSc7XG4gICAgICAgIC8vIFRlc3QgYEpTT04uc3RyaW5naWZ5YC5cbiAgICAgICAgaWYgKG5hbWUgPT0gXCJqc29uLXN0cmluZ2lmeVwiKSB7XG4gICAgICAgICAgdmFyIHN0cmluZ2lmeSA9IGV4cG9ydHMuc3RyaW5naWZ5LCBzdHJpbmdpZnlTdXBwb3J0ZWQgPSB0eXBlb2Ygc3RyaW5naWZ5ID09IFwiZnVuY3Rpb25cIiAmJiBpc0V4dGVuZGVkO1xuICAgICAgICAgIGlmIChzdHJpbmdpZnlTdXBwb3J0ZWQpIHtcbiAgICAgICAgICAgIC8vIEEgdGVzdCBmdW5jdGlvbiBvYmplY3Qgd2l0aCBhIGN1c3RvbSBgdG9KU09OYCBtZXRob2QuXG4gICAgICAgICAgICAodmFsdWUgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgIHJldHVybiAxO1xuICAgICAgICAgICAgfSkudG9KU09OID0gdmFsdWU7XG4gICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICBzdHJpbmdpZnlTdXBwb3J0ZWQgPVxuICAgICAgICAgICAgICAgIC8vIEZpcmVmb3ggMy4xYjEgYW5kIGIyIHNlcmlhbGl6ZSBzdHJpbmcsIG51bWJlciwgYW5kIGJvb2xlYW5cbiAgICAgICAgICAgICAgICAvLyBwcmltaXRpdmVzIGFzIG9iamVjdCBsaXRlcmFscy5cbiAgICAgICAgICAgICAgICBzdHJpbmdpZnkoMCkgPT09IFwiMFwiICYmXG4gICAgICAgICAgICAgICAgLy8gRkYgMy4xYjEsIGIyLCBhbmQgSlNPTiAyIHNlcmlhbGl6ZSB3cmFwcGVkIHByaW1pdGl2ZXMgYXMgb2JqZWN0XG4gICAgICAgICAgICAgICAgLy8gbGl0ZXJhbHMuXG4gICAgICAgICAgICAgICAgc3RyaW5naWZ5KG5ldyBOdW1iZXIoKSkgPT09IFwiMFwiICYmXG4gICAgICAgICAgICAgICAgc3RyaW5naWZ5KG5ldyBTdHJpbmcoKSkgPT0gJ1wiXCInICYmXG4gICAgICAgICAgICAgICAgLy8gRkYgMy4xYjEsIDIgdGhyb3cgYW4gZXJyb3IgaWYgdGhlIHZhbHVlIGlzIGBudWxsYCwgYHVuZGVmaW5lZGAsIG9yXG4gICAgICAgICAgICAgICAgLy8gZG9lcyBub3QgZGVmaW5lIGEgY2Fub25pY2FsIEpTT04gcmVwcmVzZW50YXRpb24gKHRoaXMgYXBwbGllcyB0b1xuICAgICAgICAgICAgICAgIC8vIG9iamVjdHMgd2l0aCBgdG9KU09OYCBwcm9wZXJ0aWVzIGFzIHdlbGwsICp1bmxlc3MqIHRoZXkgYXJlIG5lc3RlZFxuICAgICAgICAgICAgICAgIC8vIHdpdGhpbiBhbiBvYmplY3Qgb3IgYXJyYXkpLlxuICAgICAgICAgICAgICAgIHN0cmluZ2lmeShnZXRDbGFzcykgPT09IHVuZGVmICYmXG4gICAgICAgICAgICAgICAgLy8gSUUgOCBzZXJpYWxpemVzIGB1bmRlZmluZWRgIGFzIGBcInVuZGVmaW5lZFwiYC4gU2FmYXJpIDw9IDUuMS43IGFuZFxuICAgICAgICAgICAgICAgIC8vIEZGIDMuMWIzIHBhc3MgdGhpcyB0ZXN0LlxuICAgICAgICAgICAgICAgIHN0cmluZ2lmeSh1bmRlZikgPT09IHVuZGVmICYmXG4gICAgICAgICAgICAgICAgLy8gU2FmYXJpIDw9IDUuMS43IGFuZCBGRiAzLjFiMyB0aHJvdyBgRXJyb3JgcyBhbmQgYFR5cGVFcnJvcmBzLFxuICAgICAgICAgICAgICAgIC8vIHJlc3BlY3RpdmVseSwgaWYgdGhlIHZhbHVlIGlzIG9taXR0ZWQgZW50aXJlbHkuXG4gICAgICAgICAgICAgICAgc3RyaW5naWZ5KCkgPT09IHVuZGVmICYmXG4gICAgICAgICAgICAgICAgLy8gRkYgMy4xYjEsIDIgdGhyb3cgYW4gZXJyb3IgaWYgdGhlIGdpdmVuIHZhbHVlIGlzIG5vdCBhIG51bWJlcixcbiAgICAgICAgICAgICAgICAvLyBzdHJpbmcsIGFycmF5LCBvYmplY3QsIEJvb2xlYW4sIG9yIGBudWxsYCBsaXRlcmFsLiBUaGlzIGFwcGxpZXMgdG9cbiAgICAgICAgICAgICAgICAvLyBvYmplY3RzIHdpdGggY3VzdG9tIGB0b0pTT05gIG1ldGhvZHMgYXMgd2VsbCwgdW5sZXNzIHRoZXkgYXJlIG5lc3RlZFxuICAgICAgICAgICAgICAgIC8vIGluc2lkZSBvYmplY3Qgb3IgYXJyYXkgbGl0ZXJhbHMuIFlVSSAzLjAuMGIxIGlnbm9yZXMgY3VzdG9tIGB0b0pTT05gXG4gICAgICAgICAgICAgICAgLy8gbWV0aG9kcyBlbnRpcmVseS5cbiAgICAgICAgICAgICAgICBzdHJpbmdpZnkodmFsdWUpID09PSBcIjFcIiAmJlxuICAgICAgICAgICAgICAgIHN0cmluZ2lmeShbdmFsdWVdKSA9PSBcIlsxXVwiICYmXG4gICAgICAgICAgICAgICAgLy8gUHJvdG90eXBlIDw9IDEuNi4xIHNlcmlhbGl6ZXMgYFt1bmRlZmluZWRdYCBhcyBgXCJbXVwiYCBpbnN0ZWFkIG9mXG4gICAgICAgICAgICAgICAgLy8gYFwiW251bGxdXCJgLlxuICAgICAgICAgICAgICAgIHN0cmluZ2lmeShbdW5kZWZdKSA9PSBcIltudWxsXVwiICYmXG4gICAgICAgICAgICAgICAgLy8gWVVJIDMuMC4wYjEgZmFpbHMgdG8gc2VyaWFsaXplIGBudWxsYCBsaXRlcmFscy5cbiAgICAgICAgICAgICAgICBzdHJpbmdpZnkobnVsbCkgPT0gXCJudWxsXCIgJiZcbiAgICAgICAgICAgICAgICAvLyBGRiAzLjFiMSwgMiBoYWx0cyBzZXJpYWxpemF0aW9uIGlmIGFuIGFycmF5IGNvbnRhaW5zIGEgZnVuY3Rpb246XG4gICAgICAgICAgICAgICAgLy8gYFsxLCB0cnVlLCBnZXRDbGFzcywgMV1gIHNlcmlhbGl6ZXMgYXMgXCJbMSx0cnVlLF0sXCIuIEZGIDMuMWIzXG4gICAgICAgICAgICAgICAgLy8gZWxpZGVzIG5vbi1KU09OIHZhbHVlcyBmcm9tIG9iamVjdHMgYW5kIGFycmF5cywgdW5sZXNzIHRoZXlcbiAgICAgICAgICAgICAgICAvLyBkZWZpbmUgY3VzdG9tIGB0b0pTT05gIG1ldGhvZHMuXG4gICAgICAgICAgICAgICAgc3RyaW5naWZ5KFt1bmRlZiwgZ2V0Q2xhc3MsIG51bGxdKSA9PSBcIltudWxsLG51bGwsbnVsbF1cIiAmJlxuICAgICAgICAgICAgICAgIC8vIFNpbXBsZSBzZXJpYWxpemF0aW9uIHRlc3QuIEZGIDMuMWIxIHVzZXMgVW5pY29kZSBlc2NhcGUgc2VxdWVuY2VzXG4gICAgICAgICAgICAgICAgLy8gd2hlcmUgY2hhcmFjdGVyIGVzY2FwZSBjb2RlcyBhcmUgZXhwZWN0ZWQgKGUuZy4sIGBcXGJgID0+IGBcXHUwMDA4YCkuXG4gICAgICAgICAgICAgICAgc3RyaW5naWZ5KHsgXCJhXCI6IFt2YWx1ZSwgdHJ1ZSwgZmFsc2UsIG51bGwsIFwiXFx4MDBcXGJcXG5cXGZcXHJcXHRcIl0gfSkgPT0gc2VyaWFsaXplZCAmJlxuICAgICAgICAgICAgICAgIC8vIEZGIDMuMWIxIGFuZCBiMiBpZ25vcmUgdGhlIGBmaWx0ZXJgIGFuZCBgd2lkdGhgIGFyZ3VtZW50cy5cbiAgICAgICAgICAgICAgICBzdHJpbmdpZnkobnVsbCwgdmFsdWUpID09PSBcIjFcIiAmJlxuICAgICAgICAgICAgICAgIHN0cmluZ2lmeShbMSwgMl0sIG51bGwsIDEpID09IFwiW1xcbiAxLFxcbiAyXFxuXVwiICYmXG4gICAgICAgICAgICAgICAgLy8gSlNPTiAyLCBQcm90b3R5cGUgPD0gMS43LCBhbmQgb2xkZXIgV2ViS2l0IGJ1aWxkcyBpbmNvcnJlY3RseVxuICAgICAgICAgICAgICAgIC8vIHNlcmlhbGl6ZSBleHRlbmRlZCB5ZWFycy5cbiAgICAgICAgICAgICAgICBzdHJpbmdpZnkobmV3IERhdGUoLTguNjRlMTUpKSA9PSAnXCItMjcxODIxLTA0LTIwVDAwOjAwOjAwLjAwMFpcIicgJiZcbiAgICAgICAgICAgICAgICAvLyBUaGUgbWlsbGlzZWNvbmRzIGFyZSBvcHRpb25hbCBpbiBFUyA1LCBidXQgcmVxdWlyZWQgaW4gNS4xLlxuICAgICAgICAgICAgICAgIHN0cmluZ2lmeShuZXcgRGF0ZSg4LjY0ZTE1KSkgPT0gJ1wiKzI3NTc2MC0wOS0xM1QwMDowMDowMC4wMDBaXCInICYmXG4gICAgICAgICAgICAgICAgLy8gRmlyZWZveCA8PSAxMS4wIGluY29ycmVjdGx5IHNlcmlhbGl6ZXMgeWVhcnMgcHJpb3IgdG8gMCBhcyBuZWdhdGl2ZVxuICAgICAgICAgICAgICAgIC8vIGZvdXItZGlnaXQgeWVhcnMgaW5zdGVhZCBvZiBzaXgtZGlnaXQgeWVhcnMuIENyZWRpdHM6IEBZYWZmbGUuXG4gICAgICAgICAgICAgICAgc3RyaW5naWZ5KG5ldyBEYXRlKC02MjE5ODc1NTJlNSkpID09ICdcIi0wMDAwMDEtMDEtMDFUMDA6MDA6MDAuMDAwWlwiJyAmJlxuICAgICAgICAgICAgICAgIC8vIFNhZmFyaSA8PSA1LjEuNSBhbmQgT3BlcmEgPj0gMTAuNTMgaW5jb3JyZWN0bHkgc2VyaWFsaXplIG1pbGxpc2Vjb25kXG4gICAgICAgICAgICAgICAgLy8gdmFsdWVzIGxlc3MgdGhhbiAxMDAwLiBDcmVkaXRzOiBAWWFmZmxlLlxuICAgICAgICAgICAgICAgIHN0cmluZ2lmeShuZXcgRGF0ZSgtMSkpID09ICdcIjE5NjktMTItMzFUMjM6NTk6NTkuOTk5WlwiJztcbiAgICAgICAgICAgIH0gY2F0Y2ggKGV4Y2VwdGlvbikge1xuICAgICAgICAgICAgICBzdHJpbmdpZnlTdXBwb3J0ZWQgPSBmYWxzZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgICAgaXNTdXBwb3J0ZWQgPSBzdHJpbmdpZnlTdXBwb3J0ZWQ7XG4gICAgICAgIH1cbiAgICAgICAgLy8gVGVzdCBgSlNPTi5wYXJzZWAuXG4gICAgICAgIGlmIChuYW1lID09IFwianNvbi1wYXJzZVwiKSB7XG4gICAgICAgICAgdmFyIHBhcnNlID0gZXhwb3J0cy5wYXJzZTtcbiAgICAgICAgICBpZiAodHlwZW9mIHBhcnNlID09IFwiZnVuY3Rpb25cIikge1xuICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgLy8gRkYgMy4xYjEsIGIyIHdpbGwgdGhyb3cgYW4gZXhjZXB0aW9uIGlmIGEgYmFyZSBsaXRlcmFsIGlzIHByb3ZpZGVkLlxuICAgICAgICAgICAgICAvLyBDb25mb3JtaW5nIGltcGxlbWVudGF0aW9ucyBzaG91bGQgYWxzbyBjb2VyY2UgdGhlIGluaXRpYWwgYXJndW1lbnQgdG9cbiAgICAgICAgICAgICAgLy8gYSBzdHJpbmcgcHJpb3IgdG8gcGFyc2luZy5cbiAgICAgICAgICAgICAgaWYgKHBhcnNlKFwiMFwiKSA9PT0gMCAmJiAhcGFyc2UoZmFsc2UpKSB7XG4gICAgICAgICAgICAgICAgLy8gU2ltcGxlIHBhcnNpbmcgdGVzdC5cbiAgICAgICAgICAgICAgICB2YWx1ZSA9IHBhcnNlKHNlcmlhbGl6ZWQpO1xuICAgICAgICAgICAgICAgIHZhciBwYXJzZVN1cHBvcnRlZCA9IHZhbHVlW1wiYVwiXS5sZW5ndGggPT0gNSAmJiB2YWx1ZVtcImFcIl1bMF0gPT09IDE7XG4gICAgICAgICAgICAgICAgaWYgKHBhcnNlU3VwcG9ydGVkKSB7XG4gICAgICAgICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgICAgICAvLyBTYWZhcmkgPD0gNS4xLjIgYW5kIEZGIDMuMWIxIGFsbG93IHVuZXNjYXBlZCB0YWJzIGluIHN0cmluZ3MuXG4gICAgICAgICAgICAgICAgICAgIHBhcnNlU3VwcG9ydGVkID0gIXBhcnNlKCdcIlxcdFwiJyk7XG4gICAgICAgICAgICAgICAgICB9IGNhdGNoIChleGNlcHRpb24pIHt9XG4gICAgICAgICAgICAgICAgICBpZiAocGFyc2VTdXBwb3J0ZWQpIHtcbiAgICAgICAgICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICAgICAgICAvLyBGRiA0LjAgYW5kIDQuMC4xIGFsbG93IGxlYWRpbmcgYCtgIHNpZ25zIGFuZCBsZWFkaW5nXG4gICAgICAgICAgICAgICAgICAgICAgLy8gZGVjaW1hbCBwb2ludHMuIEZGIDQuMCwgNC4wLjEsIGFuZCBJRSA5LTEwIGFsc28gYWxsb3dcbiAgICAgICAgICAgICAgICAgICAgICAvLyBjZXJ0YWluIG9jdGFsIGxpdGVyYWxzLlxuICAgICAgICAgICAgICAgICAgICAgIHBhcnNlU3VwcG9ydGVkID0gcGFyc2UoXCIwMVwiKSAhPT0gMTtcbiAgICAgICAgICAgICAgICAgICAgfSBjYXRjaCAoZXhjZXB0aW9uKSB7fVxuICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgaWYgKHBhcnNlU3VwcG9ydGVkKSB7XG4gICAgICAgICAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgICAgICAgLy8gRkYgNC4wLCA0LjAuMSwgYW5kIFJoaW5vIDEuN1IzLVI0IGFsbG93IHRyYWlsaW5nIGRlY2ltYWxcbiAgICAgICAgICAgICAgICAgICAgICAvLyBwb2ludHMuIFRoZXNlIGVudmlyb25tZW50cywgYWxvbmcgd2l0aCBGRiAzLjFiMSBhbmQgMixcbiAgICAgICAgICAgICAgICAgICAgICAvLyBhbHNvIGFsbG93IHRyYWlsaW5nIGNvbW1hcyBpbiBKU09OIG9iamVjdHMgYW5kIGFycmF5cy5cbiAgICAgICAgICAgICAgICAgICAgICBwYXJzZVN1cHBvcnRlZCA9IHBhcnNlKFwiMS5cIikgIT09IDE7XG4gICAgICAgICAgICAgICAgICAgIH0gY2F0Y2ggKGV4Y2VwdGlvbikge31cbiAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gY2F0Y2ggKGV4Y2VwdGlvbikge1xuICAgICAgICAgICAgICBwYXJzZVN1cHBvcnRlZCA9IGZhbHNlO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgICBpc1N1cHBvcnRlZCA9IHBhcnNlU3VwcG9ydGVkO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICByZXR1cm4gaGFzW25hbWVdID0gISFpc1N1cHBvcnRlZDtcbiAgICB9XG5cbiAgICBpZiAodHJ1ZSkgeyAvLyB1c2VkIHRvIGJlICFoYXMoXCJqc29uXCIpXG4gICAgICAvLyBDb21tb24gYFtbQ2xhc3NdXWAgbmFtZSBhbGlhc2VzLlxuICAgICAgdmFyIGZ1bmN0aW9uQ2xhc3MgPSBcIltvYmplY3QgRnVuY3Rpb25dXCIsXG4gICAgICAgICAgZGF0ZUNsYXNzID0gXCJbb2JqZWN0IERhdGVdXCIsXG4gICAgICAgICAgbnVtYmVyQ2xhc3MgPSBcIltvYmplY3QgTnVtYmVyXVwiLFxuICAgICAgICAgIHN0cmluZ0NsYXNzID0gXCJbb2JqZWN0IFN0cmluZ11cIixcbiAgICAgICAgICBhcnJheUNsYXNzID0gXCJbb2JqZWN0IEFycmF5XVwiLFxuICAgICAgICAgIGJvb2xlYW5DbGFzcyA9IFwiW29iamVjdCBCb29sZWFuXVwiO1xuXG4gICAgICAvLyBEZXRlY3QgaW5jb21wbGV0ZSBzdXBwb3J0IGZvciBhY2Nlc3Npbmcgc3RyaW5nIGNoYXJhY3RlcnMgYnkgaW5kZXguXG4gICAgICB2YXIgY2hhckluZGV4QnVnZ3kgPSBoYXMoXCJidWctc3RyaW5nLWNoYXItaW5kZXhcIik7XG5cbiAgICAgIC8vIERlZmluZSBhZGRpdGlvbmFsIHV0aWxpdHkgbWV0aG9kcyBpZiB0aGUgYERhdGVgIG1ldGhvZHMgYXJlIGJ1Z2d5LlxuICAgICAgaWYgKCFpc0V4dGVuZGVkKSB7XG4gICAgICAgIHZhciBmbG9vciA9IE1hdGguZmxvb3I7XG4gICAgICAgIC8vIEEgbWFwcGluZyBiZXR3ZWVuIHRoZSBtb250aHMgb2YgdGhlIHllYXIgYW5kIHRoZSBudW1iZXIgb2YgZGF5cyBiZXR3ZWVuXG4gICAgICAgIC8vIEphbnVhcnkgMXN0IGFuZCB0aGUgZmlyc3Qgb2YgdGhlIHJlc3BlY3RpdmUgbW9udGguXG4gICAgICAgIHZhciBNb250aHMgPSBbMCwgMzEsIDU5LCA5MCwgMTIwLCAxNTEsIDE4MSwgMjEyLCAyNDMsIDI3MywgMzA0LCAzMzRdO1xuICAgICAgICAvLyBJbnRlcm5hbDogQ2FsY3VsYXRlcyB0aGUgbnVtYmVyIG9mIGRheXMgYmV0d2VlbiB0aGUgVW5peCBlcG9jaCBhbmQgdGhlXG4gICAgICAgIC8vIGZpcnN0IGRheSBvZiB0aGUgZ2l2ZW4gbW9udGguXG4gICAgICAgIHZhciBnZXREYXkgPSBmdW5jdGlvbiAoeWVhciwgbW9udGgpIHtcbiAgICAgICAgICByZXR1cm4gTW9udGhzW21vbnRoXSArIDM2NSAqICh5ZWFyIC0gMTk3MCkgKyBmbG9vcigoeWVhciAtIDE5NjkgKyAobW9udGggPSArKG1vbnRoID4gMSkpKSAvIDQpIC0gZmxvb3IoKHllYXIgLSAxOTAxICsgbW9udGgpIC8gMTAwKSArIGZsb29yKCh5ZWFyIC0gMTYwMSArIG1vbnRoKSAvIDQwMCk7XG4gICAgICAgIH07XG4gICAgICB9XG5cbiAgICAgIC8vIEludGVybmFsOiBEZXRlcm1pbmVzIGlmIGEgcHJvcGVydHkgaXMgYSBkaXJlY3QgcHJvcGVydHkgb2YgdGhlIGdpdmVuXG4gICAgICAvLyBvYmplY3QuIERlbGVnYXRlcyB0byB0aGUgbmF0aXZlIGBPYmplY3QjaGFzT3duUHJvcGVydHlgIG1ldGhvZC5cbiAgICAgIGlmICghKGlzUHJvcGVydHkgPSBvYmplY3RQcm90by5oYXNPd25Qcm9wZXJ0eSkpIHtcbiAgICAgICAgaXNQcm9wZXJ0eSA9IGZ1bmN0aW9uIChwcm9wZXJ0eSkge1xuICAgICAgICAgIHZhciBtZW1iZXJzID0ge30sIGNvbnN0cnVjdG9yO1xuICAgICAgICAgIGlmICgobWVtYmVycy5fX3Byb3RvX18gPSBudWxsLCBtZW1iZXJzLl9fcHJvdG9fXyA9IHtcbiAgICAgICAgICAgIC8vIFRoZSAqcHJvdG8qIHByb3BlcnR5IGNhbm5vdCBiZSBzZXQgbXVsdGlwbGUgdGltZXMgaW4gcmVjZW50XG4gICAgICAgICAgICAvLyB2ZXJzaW9ucyBvZiBGaXJlZm94IGFuZCBTZWFNb25rZXkuXG4gICAgICAgICAgICBcInRvU3RyaW5nXCI6IDFcbiAgICAgICAgICB9LCBtZW1iZXJzKS50b1N0cmluZyAhPSBnZXRDbGFzcykge1xuICAgICAgICAgICAgLy8gU2FmYXJpIDw9IDIuMC4zIGRvZXNuJ3QgaW1wbGVtZW50IGBPYmplY3QjaGFzT3duUHJvcGVydHlgLCBidXRcbiAgICAgICAgICAgIC8vIHN1cHBvcnRzIHRoZSBtdXRhYmxlICpwcm90byogcHJvcGVydHkuXG4gICAgICAgICAgICBpc1Byb3BlcnR5ID0gZnVuY3Rpb24gKHByb3BlcnR5KSB7XG4gICAgICAgICAgICAgIC8vIENhcHR1cmUgYW5kIGJyZWFrIHRoZSBvYmplY3QncyBwcm90b3R5cGUgY2hhaW4gKHNlZSBzZWN0aW9uIDguNi4yXG4gICAgICAgICAgICAgIC8vIG9mIHRoZSBFUyA1LjEgc3BlYykuIFRoZSBwYXJlbnRoZXNpemVkIGV4cHJlc3Npb24gcHJldmVudHMgYW5cbiAgICAgICAgICAgICAgLy8gdW5zYWZlIHRyYW5zZm9ybWF0aW9uIGJ5IHRoZSBDbG9zdXJlIENvbXBpbGVyLlxuICAgICAgICAgICAgICB2YXIgb3JpZ2luYWwgPSB0aGlzLl9fcHJvdG9fXywgcmVzdWx0ID0gcHJvcGVydHkgaW4gKHRoaXMuX19wcm90b19fID0gbnVsbCwgdGhpcyk7XG4gICAgICAgICAgICAgIC8vIFJlc3RvcmUgdGhlIG9yaWdpbmFsIHByb3RvdHlwZSBjaGFpbi5cbiAgICAgICAgICAgICAgdGhpcy5fX3Byb3RvX18gPSBvcmlnaW5hbDtcbiAgICAgICAgICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICAgICAgICAgIH07XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIC8vIENhcHR1cmUgYSByZWZlcmVuY2UgdG8gdGhlIHRvcC1sZXZlbCBgT2JqZWN0YCBjb25zdHJ1Y3Rvci5cbiAgICAgICAgICAgIGNvbnN0cnVjdG9yID0gbWVtYmVycy5jb25zdHJ1Y3RvcjtcbiAgICAgICAgICAgIC8vIFVzZSB0aGUgYGNvbnN0cnVjdG9yYCBwcm9wZXJ0eSB0byBzaW11bGF0ZSBgT2JqZWN0I2hhc093blByb3BlcnR5YCBpblxuICAgICAgICAgICAgLy8gb3RoZXIgZW52aXJvbm1lbnRzLlxuICAgICAgICAgICAgaXNQcm9wZXJ0eSA9IGZ1bmN0aW9uIChwcm9wZXJ0eSkge1xuICAgICAgICAgICAgICB2YXIgcGFyZW50ID0gKHRoaXMuY29uc3RydWN0b3IgfHwgY29uc3RydWN0b3IpLnByb3RvdHlwZTtcbiAgICAgICAgICAgICAgcmV0dXJuIHByb3BlcnR5IGluIHRoaXMgJiYgIShwcm9wZXJ0eSBpbiBwYXJlbnQgJiYgdGhpc1twcm9wZXJ0eV0gPT09IHBhcmVudFtwcm9wZXJ0eV0pO1xuICAgICAgICAgICAgfTtcbiAgICAgICAgICB9XG4gICAgICAgICAgbWVtYmVycyA9IG51bGw7XG4gICAgICAgICAgcmV0dXJuIGlzUHJvcGVydHkuY2FsbCh0aGlzLCBwcm9wZXJ0eSk7XG4gICAgICAgIH07XG4gICAgICB9XG5cbiAgICAgIC8vIEludGVybmFsOiBOb3JtYWxpemVzIHRoZSBgZm9yLi4uaW5gIGl0ZXJhdGlvbiBhbGdvcml0aG0gYWNyb3NzXG4gICAgICAvLyBlbnZpcm9ubWVudHMuIEVhY2ggZW51bWVyYXRlZCBrZXkgaXMgeWllbGRlZCB0byBhIGBjYWxsYmFja2AgZnVuY3Rpb24uXG4gICAgICBmb3JFYWNoID0gZnVuY3Rpb24gKG9iamVjdCwgY2FsbGJhY2spIHtcbiAgICAgICAgdmFyIHNpemUgPSAwLCBQcm9wZXJ0aWVzLCBtZW1iZXJzLCBwcm9wZXJ0eTtcblxuICAgICAgICAvLyBUZXN0cyBmb3IgYnVncyBpbiB0aGUgY3VycmVudCBlbnZpcm9ubWVudCdzIGBmb3IuLi5pbmAgYWxnb3JpdGhtLiBUaGVcbiAgICAgICAgLy8gYHZhbHVlT2ZgIHByb3BlcnR5IGluaGVyaXRzIHRoZSBub24tZW51bWVyYWJsZSBmbGFnIGZyb21cbiAgICAgICAgLy8gYE9iamVjdC5wcm90b3R5cGVgIGluIG9sZGVyIHZlcnNpb25zIG9mIElFLCBOZXRzY2FwZSwgYW5kIE1vemlsbGEuXG4gICAgICAgIChQcm9wZXJ0aWVzID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgIHRoaXMudmFsdWVPZiA9IDA7XG4gICAgICAgIH0pLnByb3RvdHlwZS52YWx1ZU9mID0gMDtcblxuICAgICAgICAvLyBJdGVyYXRlIG92ZXIgYSBuZXcgaW5zdGFuY2Ugb2YgdGhlIGBQcm9wZXJ0aWVzYCBjbGFzcy5cbiAgICAgICAgbWVtYmVycyA9IG5ldyBQcm9wZXJ0aWVzKCk7XG4gICAgICAgIGZvciAocHJvcGVydHkgaW4gbWVtYmVycykge1xuICAgICAgICAgIC8vIElnbm9yZSBhbGwgcHJvcGVydGllcyBpbmhlcml0ZWQgZnJvbSBgT2JqZWN0LnByb3RvdHlwZWAuXG4gICAgICAgICAgaWYgKGlzUHJvcGVydHkuY2FsbChtZW1iZXJzLCBwcm9wZXJ0eSkpIHtcbiAgICAgICAgICAgIHNpemUrKztcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgUHJvcGVydGllcyA9IG1lbWJlcnMgPSBudWxsO1xuXG4gICAgICAgIC8vIE5vcm1hbGl6ZSB0aGUgaXRlcmF0aW9uIGFsZ29yaXRobS5cbiAgICAgICAgaWYgKCFzaXplKSB7XG4gICAgICAgICAgLy8gQSBsaXN0IG9mIG5vbi1lbnVtZXJhYmxlIHByb3BlcnRpZXMgaW5oZXJpdGVkIGZyb20gYE9iamVjdC5wcm90b3R5cGVgLlxuICAgICAgICAgIG1lbWJlcnMgPSBbXCJ2YWx1ZU9mXCIsIFwidG9TdHJpbmdcIiwgXCJ0b0xvY2FsZVN0cmluZ1wiLCBcInByb3BlcnR5SXNFbnVtZXJhYmxlXCIsIFwiaXNQcm90b3R5cGVPZlwiLCBcImhhc093blByb3BlcnR5XCIsIFwiY29uc3RydWN0b3JcIl07XG4gICAgICAgICAgLy8gSUUgPD0gOCwgTW96aWxsYSAxLjAsIGFuZCBOZXRzY2FwZSA2LjIgaWdub3JlIHNoYWRvd2VkIG5vbi1lbnVtZXJhYmxlXG4gICAgICAgICAgLy8gcHJvcGVydGllcy5cbiAgICAgICAgICBmb3JFYWNoID0gZnVuY3Rpb24gKG9iamVjdCwgY2FsbGJhY2spIHtcbiAgICAgICAgICAgIHZhciBpc0Z1bmN0aW9uID0gZ2V0Q2xhc3MuY2FsbChvYmplY3QpID09IGZ1bmN0aW9uQ2xhc3MsIHByb3BlcnR5LCBsZW5ndGg7XG4gICAgICAgICAgICB2YXIgaGFzUHJvcGVydHkgPSAhaXNGdW5jdGlvbiAmJiB0eXBlb2Ygb2JqZWN0LmNvbnN0cnVjdG9yICE9IFwiZnVuY3Rpb25cIiAmJiBvYmplY3RUeXBlc1t0eXBlb2Ygb2JqZWN0Lmhhc093blByb3BlcnR5XSAmJiBvYmplY3QuaGFzT3duUHJvcGVydHkgfHwgaXNQcm9wZXJ0eTtcbiAgICAgICAgICAgIGZvciAocHJvcGVydHkgaW4gb2JqZWN0KSB7XG4gICAgICAgICAgICAgIC8vIEdlY2tvIDw9IDEuMCBlbnVtZXJhdGVzIHRoZSBgcHJvdG90eXBlYCBwcm9wZXJ0eSBvZiBmdW5jdGlvbnMgdW5kZXJcbiAgICAgICAgICAgICAgLy8gY2VydGFpbiBjb25kaXRpb25zOyBJRSBkb2VzIG5vdC5cbiAgICAgICAgICAgICAgaWYgKCEoaXNGdW5jdGlvbiAmJiBwcm9wZXJ0eSA9PSBcInByb3RvdHlwZVwiKSAmJiBoYXNQcm9wZXJ0eS5jYWxsKG9iamVjdCwgcHJvcGVydHkpKSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2socHJvcGVydHkpO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICAvLyBNYW51YWxseSBpbnZva2UgdGhlIGNhbGxiYWNrIGZvciBlYWNoIG5vbi1lbnVtZXJhYmxlIHByb3BlcnR5LlxuICAgICAgICAgICAgZm9yIChsZW5ndGggPSBtZW1iZXJzLmxlbmd0aDsgcHJvcGVydHkgPSBtZW1iZXJzWy0tbGVuZ3RoXTsgaGFzUHJvcGVydHkuY2FsbChvYmplY3QsIHByb3BlcnR5KSAmJiBjYWxsYmFjayhwcm9wZXJ0eSkpO1xuICAgICAgICAgIH07XG4gICAgICAgIH0gZWxzZSBpZiAoc2l6ZSA9PSAyKSB7XG4gICAgICAgICAgLy8gU2FmYXJpIDw9IDIuMC40IGVudW1lcmF0ZXMgc2hhZG93ZWQgcHJvcGVydGllcyB0d2ljZS5cbiAgICAgICAgICBmb3JFYWNoID0gZnVuY3Rpb24gKG9iamVjdCwgY2FsbGJhY2spIHtcbiAgICAgICAgICAgIC8vIENyZWF0ZSBhIHNldCBvZiBpdGVyYXRlZCBwcm9wZXJ0aWVzLlxuICAgICAgICAgICAgdmFyIG1lbWJlcnMgPSB7fSwgaXNGdW5jdGlvbiA9IGdldENsYXNzLmNhbGwob2JqZWN0KSA9PSBmdW5jdGlvbkNsYXNzLCBwcm9wZXJ0eTtcbiAgICAgICAgICAgIGZvciAocHJvcGVydHkgaW4gb2JqZWN0KSB7XG4gICAgICAgICAgICAgIC8vIFN0b3JlIGVhY2ggcHJvcGVydHkgbmFtZSB0byBwcmV2ZW50IGRvdWJsZSBlbnVtZXJhdGlvbi4gVGhlXG4gICAgICAgICAgICAgIC8vIGBwcm90b3R5cGVgIHByb3BlcnR5IG9mIGZ1bmN0aW9ucyBpcyBub3QgZW51bWVyYXRlZCBkdWUgdG8gY3Jvc3MtXG4gICAgICAgICAgICAgIC8vIGVudmlyb25tZW50IGluY29uc2lzdGVuY2llcy5cbiAgICAgICAgICAgICAgaWYgKCEoaXNGdW5jdGlvbiAmJiBwcm9wZXJ0eSA9PSBcInByb3RvdHlwZVwiKSAmJiAhaXNQcm9wZXJ0eS5jYWxsKG1lbWJlcnMsIHByb3BlcnR5KSAmJiAobWVtYmVyc1twcm9wZXJ0eV0gPSAxKSAmJiBpc1Byb3BlcnR5LmNhbGwob2JqZWN0LCBwcm9wZXJ0eSkpIHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayhwcm9wZXJ0eSk7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9O1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIC8vIE5vIGJ1Z3MgZGV0ZWN0ZWQ7IHVzZSB0aGUgc3RhbmRhcmQgYGZvci4uLmluYCBhbGdvcml0aG0uXG4gICAgICAgICAgZm9yRWFjaCA9IGZ1bmN0aW9uIChvYmplY3QsIGNhbGxiYWNrKSB7XG4gICAgICAgICAgICB2YXIgaXNGdW5jdGlvbiA9IGdldENsYXNzLmNhbGwob2JqZWN0KSA9PSBmdW5jdGlvbkNsYXNzLCBwcm9wZXJ0eSwgaXNDb25zdHJ1Y3RvcjtcbiAgICAgICAgICAgIGZvciAocHJvcGVydHkgaW4gb2JqZWN0KSB7XG4gICAgICAgICAgICAgIGlmICghKGlzRnVuY3Rpb24gJiYgcHJvcGVydHkgPT0gXCJwcm90b3R5cGVcIikgJiYgaXNQcm9wZXJ0eS5jYWxsKG9iamVjdCwgcHJvcGVydHkpICYmICEoaXNDb25zdHJ1Y3RvciA9IHByb3BlcnR5ID09PSBcImNvbnN0cnVjdG9yXCIpKSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2socHJvcGVydHkpO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICAvLyBNYW51YWxseSBpbnZva2UgdGhlIGNhbGxiYWNrIGZvciB0aGUgYGNvbnN0cnVjdG9yYCBwcm9wZXJ0eSBkdWUgdG9cbiAgICAgICAgICAgIC8vIGNyb3NzLWVudmlyb25tZW50IGluY29uc2lzdGVuY2llcy5cbiAgICAgICAgICAgIGlmIChpc0NvbnN0cnVjdG9yIHx8IGlzUHJvcGVydHkuY2FsbChvYmplY3QsIChwcm9wZXJ0eSA9IFwiY29uc3RydWN0b3JcIikpKSB7XG4gICAgICAgICAgICAgIGNhbGxiYWNrKHByb3BlcnR5KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9O1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBmb3JFYWNoKG9iamVjdCwgY2FsbGJhY2spO1xuICAgICAgfTtcblxuICAgICAgLy8gUHVibGljOiBTZXJpYWxpemVzIGEgSmF2YVNjcmlwdCBgdmFsdWVgIGFzIGEgSlNPTiBzdHJpbmcuIFRoZSBvcHRpb25hbFxuICAgICAgLy8gYGZpbHRlcmAgYXJndW1lbnQgbWF5IHNwZWNpZnkgZWl0aGVyIGEgZnVuY3Rpb24gdGhhdCBhbHRlcnMgaG93IG9iamVjdCBhbmRcbiAgICAgIC8vIGFycmF5IG1lbWJlcnMgYXJlIHNlcmlhbGl6ZWQsIG9yIGFuIGFycmF5IG9mIHN0cmluZ3MgYW5kIG51bWJlcnMgdGhhdFxuICAgICAgLy8gaW5kaWNhdGVzIHdoaWNoIHByb3BlcnRpZXMgc2hvdWxkIGJlIHNlcmlhbGl6ZWQuIFRoZSBvcHRpb25hbCBgd2lkdGhgXG4gICAgICAvLyBhcmd1bWVudCBtYXkgYmUgZWl0aGVyIGEgc3RyaW5nIG9yIG51bWJlciB0aGF0IHNwZWNpZmllcyB0aGUgaW5kZW50YXRpb25cbiAgICAgIC8vIGxldmVsIG9mIHRoZSBvdXRwdXQuXG4gICAgICBpZiAodHJ1ZSkge1xuICAgICAgICAvLyBJbnRlcm5hbDogQSBtYXAgb2YgY29udHJvbCBjaGFyYWN0ZXJzIGFuZCB0aGVpciBlc2NhcGVkIGVxdWl2YWxlbnRzLlxuICAgICAgICB2YXIgRXNjYXBlcyA9IHtcbiAgICAgICAgICA5MjogXCJcXFxcXFxcXFwiLFxuICAgICAgICAgIDM0OiAnXFxcXFwiJyxcbiAgICAgICAgICA4OiBcIlxcXFxiXCIsXG4gICAgICAgICAgMTI6IFwiXFxcXGZcIixcbiAgICAgICAgICAxMDogXCJcXFxcblwiLFxuICAgICAgICAgIDEzOiBcIlxcXFxyXCIsXG4gICAgICAgICAgOTogXCJcXFxcdFwiXG4gICAgICAgIH07XG5cbiAgICAgICAgLy8gSW50ZXJuYWw6IENvbnZlcnRzIGB2YWx1ZWAgaW50byBhIHplcm8tcGFkZGVkIHN0cmluZyBzdWNoIHRoYXQgaXRzXG4gICAgICAgIC8vIGxlbmd0aCBpcyBhdCBsZWFzdCBlcXVhbCB0byBgd2lkdGhgLiBUaGUgYHdpZHRoYCBtdXN0IGJlIDw9IDYuXG4gICAgICAgIHZhciBsZWFkaW5nWmVyb2VzID0gXCIwMDAwMDBcIjtcbiAgICAgICAgdmFyIHRvUGFkZGVkU3RyaW5nID0gZnVuY3Rpb24gKHdpZHRoLCB2YWx1ZSkge1xuICAgICAgICAgIC8vIFRoZSBgfHwgMGAgZXhwcmVzc2lvbiBpcyBuZWNlc3NhcnkgdG8gd29yayBhcm91bmQgYSBidWcgaW5cbiAgICAgICAgICAvLyBPcGVyYSA8PSA3LjU0dTIgd2hlcmUgYDAgPT0gLTBgLCBidXQgYFN0cmluZygtMCkgIT09IFwiMFwiYC5cbiAgICAgICAgICByZXR1cm4gKGxlYWRpbmdaZXJvZXMgKyAodmFsdWUgfHwgMCkpLnNsaWNlKC13aWR0aCk7XG4gICAgICAgIH07XG5cbiAgICAgICAgLy8gSW50ZXJuYWw6IERvdWJsZS1xdW90ZXMgYSBzdHJpbmcgYHZhbHVlYCwgcmVwbGFjaW5nIGFsbCBBU0NJSSBjb250cm9sXG4gICAgICAgIC8vIGNoYXJhY3RlcnMgKGNoYXJhY3RlcnMgd2l0aCBjb2RlIHVuaXQgdmFsdWVzIGJldHdlZW4gMCBhbmQgMzEpIHdpdGhcbiAgICAgICAgLy8gdGhlaXIgZXNjYXBlZCBlcXVpdmFsZW50cy4gVGhpcyBpcyBhbiBpbXBsZW1lbnRhdGlvbiBvZiB0aGVcbiAgICAgICAgLy8gYFF1b3RlKHZhbHVlKWAgb3BlcmF0aW9uIGRlZmluZWQgaW4gRVMgNS4xIHNlY3Rpb24gMTUuMTIuMy5cbiAgICAgICAgdmFyIHVuaWNvZGVQcmVmaXggPSBcIlxcXFx1MDBcIjtcbiAgICAgICAgdmFyIHF1b3RlID0gZnVuY3Rpb24gKHZhbHVlKSB7XG4gICAgICAgICAgdmFyIHJlc3VsdCA9ICdcIicsIGluZGV4ID0gMCwgbGVuZ3RoID0gdmFsdWUubGVuZ3RoLCB1c2VDaGFySW5kZXggPSAhY2hhckluZGV4QnVnZ3kgfHwgbGVuZ3RoID4gMTA7XG4gICAgICAgICAgdmFyIHN5bWJvbHMgPSB1c2VDaGFySW5kZXggJiYgKGNoYXJJbmRleEJ1Z2d5ID8gdmFsdWUuc3BsaXQoXCJcIikgOiB2YWx1ZSk7XG4gICAgICAgICAgZm9yICg7IGluZGV4IDwgbGVuZ3RoOyBpbmRleCsrKSB7XG4gICAgICAgICAgICB2YXIgY2hhckNvZGUgPSB2YWx1ZS5jaGFyQ29kZUF0KGluZGV4KTtcbiAgICAgICAgICAgIC8vIElmIHRoZSBjaGFyYWN0ZXIgaXMgYSBjb250cm9sIGNoYXJhY3RlciwgYXBwZW5kIGl0cyBVbmljb2RlIG9yXG4gICAgICAgICAgICAvLyBzaG9ydGhhbmQgZXNjYXBlIHNlcXVlbmNlOyBvdGhlcndpc2UsIGFwcGVuZCB0aGUgY2hhcmFjdGVyIGFzLWlzLlxuICAgICAgICAgICAgc3dpdGNoIChjaGFyQ29kZSkge1xuICAgICAgICAgICAgICBjYXNlIDg6IGNhc2UgOTogY2FzZSAxMDogY2FzZSAxMjogY2FzZSAxMzogY2FzZSAzNDogY2FzZSA5MjpcbiAgICAgICAgICAgICAgICByZXN1bHQgKz0gRXNjYXBlc1tjaGFyQ29kZV07XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICAgICAgaWYgKGNoYXJDb2RlIDwgMzIpIHtcbiAgICAgICAgICAgICAgICAgIHJlc3VsdCArPSB1bmljb2RlUHJlZml4ICsgdG9QYWRkZWRTdHJpbmcoMiwgY2hhckNvZGUudG9TdHJpbmcoMTYpKTtcbiAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICByZXN1bHQgKz0gdXNlQ2hhckluZGV4ID8gc3ltYm9sc1tpbmRleF0gOiB2YWx1ZS5jaGFyQXQoaW5kZXgpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgICByZXR1cm4gcmVzdWx0ICsgJ1wiJztcbiAgICAgICAgfTtcblxuICAgICAgICAvLyBJbnRlcm5hbDogUmVjdXJzaXZlbHkgc2VyaWFsaXplcyBhbiBvYmplY3QuIEltcGxlbWVudHMgdGhlXG4gICAgICAgIC8vIGBTdHIoa2V5LCBob2xkZXIpYCwgYEpPKHZhbHVlKWAsIGFuZCBgSkEodmFsdWUpYCBvcGVyYXRpb25zLlxuICAgICAgICB2YXIgc2VyaWFsaXplID0gZnVuY3Rpb24gKHByb3BlcnR5LCBvYmplY3QsIGNhbGxiYWNrLCBwcm9wZXJ0aWVzLCB3aGl0ZXNwYWNlLCBpbmRlbnRhdGlvbiwgc3RhY2ssIG1heExpbmVMZW5ndGgpIHtcbiAgICAgICAgICB2YXIgdmFsdWUsIGNsYXNzTmFtZSwgeWVhciwgbW9udGgsIGRhdGUsIHRpbWUsIGhvdXJzLCBtaW51dGVzLCBzZWNvbmRzLCBtaWxsaXNlY29uZHMsIHJlc3VsdHMsIGVsZW1lbnQsIGluZGV4LCBsZW5ndGgsIHByZWZpeCwgcmVzdWx0O1xuXG4gICAgICAgICAgbWF4TGluZUxlbmd0aCA9IG1heExpbmVMZW5ndGggfHwgMDtcblxuICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAvLyBOZWNlc3NhcnkgZm9yIGhvc3Qgb2JqZWN0IHN1cHBvcnQuXG4gICAgICAgICAgICB2YWx1ZSA9IG9iamVjdFtwcm9wZXJ0eV07XG4gICAgICAgICAgfSBjYXRjaCAoZXhjZXB0aW9uKSB7fVxuICAgICAgICAgIGlmICh0eXBlb2YgdmFsdWUgPT0gXCJvYmplY3RcIiAmJiB2YWx1ZSkge1xuICAgICAgICAgICAgY2xhc3NOYW1lID0gZ2V0Q2xhc3MuY2FsbCh2YWx1ZSk7XG4gICAgICAgICAgICBpZiAoY2xhc3NOYW1lID09IGRhdGVDbGFzcyAmJiAhaXNQcm9wZXJ0eS5jYWxsKHZhbHVlLCBcInRvSlNPTlwiKSkge1xuICAgICAgICAgICAgICBpZiAodmFsdWUgPiAtMSAvIDAgJiYgdmFsdWUgPCAxIC8gMCkge1xuICAgICAgICAgICAgICAgIC8vIERhdGVzIGFyZSBzZXJpYWxpemVkIGFjY29yZGluZyB0byB0aGUgYERhdGUjdG9KU09OYCBtZXRob2RcbiAgICAgICAgICAgICAgICAvLyBzcGVjaWZpZWQgaW4gRVMgNS4xIHNlY3Rpb24gMTUuOS41LjQ0LiBTZWUgc2VjdGlvbiAxNS45LjEuMTVcbiAgICAgICAgICAgICAgICAvLyBmb3IgdGhlIElTTyA4NjAxIGRhdGUgdGltZSBzdHJpbmcgZm9ybWF0LlxuICAgICAgICAgICAgICAgIGlmIChnZXREYXkpIHtcbiAgICAgICAgICAgICAgICAgIC8vIE1hbnVhbGx5IGNvbXB1dGUgdGhlIHllYXIsIG1vbnRoLCBkYXRlLCBob3VycywgbWludXRlcyxcbiAgICAgICAgICAgICAgICAgIC8vIHNlY29uZHMsIGFuZCBtaWxsaXNlY29uZHMgaWYgdGhlIGBnZXRVVEMqYCBtZXRob2RzIGFyZVxuICAgICAgICAgICAgICAgICAgLy8gYnVnZ3kuIEFkYXB0ZWQgZnJvbSBAWWFmZmxlJ3MgYGRhdGUtc2hpbWAgcHJvamVjdC5cbiAgICAgICAgICAgICAgICAgIGRhdGUgPSBmbG9vcih2YWx1ZSAvIDg2NGU1KTtcbiAgICAgICAgICAgICAgICAgIGZvciAoeWVhciA9IGZsb29yKGRhdGUgLyAzNjUuMjQyNSkgKyAxOTcwIC0gMTsgZ2V0RGF5KHllYXIgKyAxLCAwKSA8PSBkYXRlOyB5ZWFyKyspO1xuICAgICAgICAgICAgICAgICAgZm9yIChtb250aCA9IGZsb29yKChkYXRlIC0gZ2V0RGF5KHllYXIsIDApKSAvIDMwLjQyKTsgZ2V0RGF5KHllYXIsIG1vbnRoICsgMSkgPD0gZGF0ZTsgbW9udGgrKyk7XG4gICAgICAgICAgICAgICAgICBkYXRlID0gMSArIGRhdGUgLSBnZXREYXkoeWVhciwgbW9udGgpO1xuICAgICAgICAgICAgICAgICAgLy8gVGhlIGB0aW1lYCB2YWx1ZSBzcGVjaWZpZXMgdGhlIHRpbWUgd2l0aGluIHRoZSBkYXkgKHNlZSBFU1xuICAgICAgICAgICAgICAgICAgLy8gNS4xIHNlY3Rpb24gMTUuOS4xLjIpLiBUaGUgZm9ybXVsYSBgKEEgJSBCICsgQikgJSBCYCBpcyB1c2VkXG4gICAgICAgICAgICAgICAgICAvLyB0byBjb21wdXRlIGBBIG1vZHVsbyBCYCwgYXMgdGhlIGAlYCBvcGVyYXRvciBkb2VzIG5vdFxuICAgICAgICAgICAgICAgICAgLy8gY29ycmVzcG9uZCB0byB0aGUgYG1vZHVsb2Agb3BlcmF0aW9uIGZvciBuZWdhdGl2ZSBudW1iZXJzLlxuICAgICAgICAgICAgICAgICAgdGltZSA9ICh2YWx1ZSAlIDg2NGU1ICsgODY0ZTUpICUgODY0ZTU7XG4gICAgICAgICAgICAgICAgICAvLyBUaGUgaG91cnMsIG1pbnV0ZXMsIHNlY29uZHMsIGFuZCBtaWxsaXNlY29uZHMgYXJlIG9idGFpbmVkIGJ5XG4gICAgICAgICAgICAgICAgICAvLyBkZWNvbXBvc2luZyB0aGUgdGltZSB3aXRoaW4gdGhlIGRheS4gU2VlIHNlY3Rpb24gMTUuOS4xLjEwLlxuICAgICAgICAgICAgICAgICAgaG91cnMgPSBmbG9vcih0aW1lIC8gMzZlNSkgJSAyNDtcbiAgICAgICAgICAgICAgICAgIG1pbnV0ZXMgPSBmbG9vcih0aW1lIC8gNmU0KSAlIDYwO1xuICAgICAgICAgICAgICAgICAgc2Vjb25kcyA9IGZsb29yKHRpbWUgLyAxZTMpICUgNjA7XG4gICAgICAgICAgICAgICAgICBtaWxsaXNlY29uZHMgPSB0aW1lICUgMWUzO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICB5ZWFyID0gdmFsdWUuZ2V0VVRDRnVsbFllYXIoKTtcbiAgICAgICAgICAgICAgICAgIG1vbnRoID0gdmFsdWUuZ2V0VVRDTW9udGgoKTtcbiAgICAgICAgICAgICAgICAgIGRhdGUgPSB2YWx1ZS5nZXRVVENEYXRlKCk7XG4gICAgICAgICAgICAgICAgICBob3VycyA9IHZhbHVlLmdldFVUQ0hvdXJzKCk7XG4gICAgICAgICAgICAgICAgICBtaW51dGVzID0gdmFsdWUuZ2V0VVRDTWludXRlcygpO1xuICAgICAgICAgICAgICAgICAgc2Vjb25kcyA9IHZhbHVlLmdldFVUQ1NlY29uZHMoKTtcbiAgICAgICAgICAgICAgICAgIG1pbGxpc2Vjb25kcyA9IHZhbHVlLmdldFVUQ01pbGxpc2Vjb25kcygpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAvLyBTZXJpYWxpemUgZXh0ZW5kZWQgeWVhcnMgY29ycmVjdGx5LlxuICAgICAgICAgICAgICAgIHZhbHVlID0gKHllYXIgPD0gMCB8fCB5ZWFyID49IDFlNCA/ICh5ZWFyIDwgMCA/IFwiLVwiIDogXCIrXCIpICsgdG9QYWRkZWRTdHJpbmcoNiwgeWVhciA8IDAgPyAteWVhciA6IHllYXIpIDogdG9QYWRkZWRTdHJpbmcoNCwgeWVhcikpICtcbiAgICAgICAgICAgICAgICAgIFwiLVwiICsgdG9QYWRkZWRTdHJpbmcoMiwgbW9udGggKyAxKSArIFwiLVwiICsgdG9QYWRkZWRTdHJpbmcoMiwgZGF0ZSkgK1xuICAgICAgICAgICAgICAgICAgLy8gTW9udGhzLCBkYXRlcywgaG91cnMsIG1pbnV0ZXMsIGFuZCBzZWNvbmRzIHNob3VsZCBoYXZlIHR3b1xuICAgICAgICAgICAgICAgICAgLy8gZGlnaXRzOyBtaWxsaXNlY29uZHMgc2hvdWxkIGhhdmUgdGhyZWUuXG4gICAgICAgICAgICAgICAgICBcIlRcIiArIHRvUGFkZGVkU3RyaW5nKDIsIGhvdXJzKSArIFwiOlwiICsgdG9QYWRkZWRTdHJpbmcoMiwgbWludXRlcykgKyBcIjpcIiArIHRvUGFkZGVkU3RyaW5nKDIsIHNlY29uZHMpICtcbiAgICAgICAgICAgICAgICAgIC8vIE1pbGxpc2Vjb25kcyBhcmUgb3B0aW9uYWwgaW4gRVMgNS4wLCBidXQgcmVxdWlyZWQgaW4gNS4xLlxuICAgICAgICAgICAgICAgICAgXCIuXCIgKyB0b1BhZGRlZFN0cmluZygzLCBtaWxsaXNlY29uZHMpICsgXCJaXCI7XG4gICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgdmFsdWUgPSBudWxsO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGVsc2UgaWYgKHR5cGVvZiB2YWx1ZS50b0pTT04gPT0gXCJmdW5jdGlvblwiICYmICgoY2xhc3NOYW1lICE9IG51bWJlckNsYXNzICYmIGNsYXNzTmFtZSAhPSBzdHJpbmdDbGFzcyAmJiBjbGFzc05hbWUgIT0gYXJyYXlDbGFzcykgfHwgaXNQcm9wZXJ0eS5jYWxsKHZhbHVlLCBcInRvSlNPTlwiKSkpIHtcbiAgICAgICAgICAgICAgLy8gUHJvdG90eXBlIDw9IDEuNi4xIGFkZHMgbm9uLXN0YW5kYXJkIGB0b0pTT05gIG1ldGhvZHMgdG8gdGhlXG4gICAgICAgICAgICAgIC8vIGBOdW1iZXJgLCBgU3RyaW5nYCwgYERhdGVgLCBhbmQgYEFycmF5YCBwcm90b3R5cGVzLiBKU09OIDNcbiAgICAgICAgICAgICAgLy8gaWdub3JlcyBhbGwgYHRvSlNPTmAgbWV0aG9kcyBvbiB0aGVzZSBvYmplY3RzIHVubGVzcyB0aGV5IGFyZVxuICAgICAgICAgICAgICAvLyBkZWZpbmVkIGRpcmVjdGx5IG9uIGFuIGluc3RhbmNlLlxuICAgICAgICAgICAgICB2YWx1ZSA9IHZhbHVlLnRvSlNPTihwcm9wZXJ0eSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICAgIGlmIChjYWxsYmFjaykge1xuICAgICAgICAgICAgLy8gSWYgYSByZXBsYWNlbWVudCBmdW5jdGlvbiB3YXMgcHJvdmlkZWQsIGNhbGwgaXQgdG8gb2J0YWluIHRoZSB2YWx1ZVxuICAgICAgICAgICAgLy8gZm9yIHNlcmlhbGl6YXRpb24uXG4gICAgICAgICAgICB2YWx1ZSA9IGNhbGxiYWNrLmNhbGwob2JqZWN0LCBwcm9wZXJ0eSwgdmFsdWUpO1xuICAgICAgICAgIH1cbiAgICAgICAgICBpZiAodmFsdWUgPT09IG51bGwpIHtcbiAgICAgICAgICAgIHJldHVybiBcIm51bGxcIjtcbiAgICAgICAgICB9XG4gICAgICAgICAgY2xhc3NOYW1lID0gZ2V0Q2xhc3MuY2FsbCh2YWx1ZSk7XG4gICAgICAgICAgaWYgKGNsYXNzTmFtZSA9PSBib29sZWFuQ2xhc3MpIHtcbiAgICAgICAgICAgIC8vIEJvb2xlYW5zIGFyZSByZXByZXNlbnRlZCBsaXRlcmFsbHkuXG4gICAgICAgICAgICByZXR1cm4gXCJcIiArIHZhbHVlO1xuICAgICAgICAgIH0gZWxzZSBpZiAoY2xhc3NOYW1lID09IG51bWJlckNsYXNzKSB7XG4gICAgICAgICAgICAvLyBKU09OIG51bWJlcnMgbXVzdCBiZSBmaW5pdGUuIGBJbmZpbml0eWAgYW5kIGBOYU5gIGFyZSBzZXJpYWxpemVkIGFzXG4gICAgICAgICAgICAvLyBgXCJudWxsXCJgLlxuICAgICAgICAgICAgcmV0dXJuIHZhbHVlID4gLTEgLyAwICYmIHZhbHVlIDwgMSAvIDAgPyBcIlwiICsgdmFsdWUgOiBcIm51bGxcIjtcbiAgICAgICAgICB9IGVsc2UgaWYgKGNsYXNzTmFtZSA9PSBzdHJpbmdDbGFzcykge1xuICAgICAgICAgICAgLy8gU3RyaW5ncyBhcmUgZG91YmxlLXF1b3RlZCBhbmQgZXNjYXBlZC5cbiAgICAgICAgICAgIHJldHVybiBxdW90ZShcIlwiICsgdmFsdWUpO1xuICAgICAgICAgIH1cbiAgICAgICAgICAvLyBSZWN1cnNpdmVseSBzZXJpYWxpemUgb2JqZWN0cyBhbmQgYXJyYXlzLlxuICAgICAgICAgIGlmICh0eXBlb2YgdmFsdWUgPT0gXCJvYmplY3RcIikge1xuICAgICAgICAgICAgLy8gQ2hlY2sgZm9yIGN5Y2xpYyBzdHJ1Y3R1cmVzLiBUaGlzIGlzIGEgbGluZWFyIHNlYXJjaDsgcGVyZm9ybWFuY2VcbiAgICAgICAgICAgIC8vIGlzIGludmVyc2VseSBwcm9wb3J0aW9uYWwgdG8gdGhlIG51bWJlciBvZiB1bmlxdWUgbmVzdGVkIG9iamVjdHMuXG4gICAgICAgICAgICBmb3IgKGxlbmd0aCA9IHN0YWNrLmxlbmd0aDsgbGVuZ3RoLS07KSB7XG4gICAgICAgICAgICAgIGlmIChzdGFja1tsZW5ndGhdID09PSB2YWx1ZSkge1xuICAgICAgICAgICAgICAgIC8vIEN5Y2xpYyBzdHJ1Y3R1cmVzIGNhbm5vdCBiZSBzZXJpYWxpemVkIGJ5IGBKU09OLnN0cmluZ2lmeWAuXG4gICAgICAgICAgICAgICAgdGhyb3cgVHlwZUVycm9yKCk7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIC8vIEFkZCB0aGUgb2JqZWN0IHRvIHRoZSBzdGFjayBvZiB0cmF2ZXJzZWQgb2JqZWN0cy5cbiAgICAgICAgICAgIHN0YWNrLnB1c2godmFsdWUpO1xuICAgICAgICAgICAgcmVzdWx0cyA9IFtdO1xuICAgICAgICAgICAgLy8gU2F2ZSB0aGUgY3VycmVudCBpbmRlbnRhdGlvbiBsZXZlbCBhbmQgaW5kZW50IG9uZSBhZGRpdGlvbmFsIGxldmVsLlxuICAgICAgICAgICAgcHJlZml4ID0gaW5kZW50YXRpb247XG4gICAgICAgICAgICBpbmRlbnRhdGlvbiArPSB3aGl0ZXNwYWNlO1xuICAgICAgICAgICAgaWYgKGNsYXNzTmFtZSA9PSBhcnJheUNsYXNzKSB7XG4gICAgICAgICAgICAgIHZhciB0b3RhbExlbmd0aCA9IGluZGVudGF0aW9uLmxlbmd0aCwgcmVzdWx0O1xuICAgICAgICAgICAgICAvLyBSZWN1cnNpdmVseSBzZXJpYWxpemUgYXJyYXkgZWxlbWVudHMuXG4gICAgICAgICAgICAgIGZvciAoaW5kZXggPSAwLCBsZW5ndGggPSB2YWx1ZS5sZW5ndGg7IGluZGV4IDwgbGVuZ3RoOyBpbmRleCsrKSB7XG4gICAgICAgICAgICAgICAgZWxlbWVudCA9IHNlcmlhbGl6ZShpbmRleCwgdmFsdWUsIGNhbGxiYWNrLCBwcm9wZXJ0aWVzLCB3aGl0ZXNwYWNlLCBpbmRlbnRhdGlvbixcbiAgICAgICAgICAgICAgICAgIHN0YWNrLCBtYXhMaW5lTGVuZ3RoKTtcbiAgICAgICAgICAgICAgICByZXN1bHQgPSBlbGVtZW50ID09PSB1bmRlZiA/IFwibnVsbFwiIDogZWxlbWVudDtcbiAgICAgICAgICAgICAgICB0b3RhbExlbmd0aCArPSByZXN1bHQubGVuZ3RoICsgKGluZGV4ID4gMCA/IDEgOiAwKTtcbiAgICAgICAgICAgICAgICByZXN1bHRzLnB1c2gocmVzdWx0KTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICByZXN1bHQgPSByZXN1bHRzLmxlbmd0aCA/XG4gICAgICAgICAgICAgICAgKFxuICAgICAgICAgICAgICAgICAgd2hpdGVzcGFjZSAmJiAodG90YWxMZW5ndGggPiBtYXhMaW5lTGVuZ3RoKSA/XG4gICAgICAgICAgICAgICAgICBcIltcXG5cIiArIGluZGVudGF0aW9uICsgcmVzdWx0cy5qb2luKFwiLFxcblwiICsgaW5kZW50YXRpb24pICsgXCJcXG5cIiArIHByZWZpeCArIFwiXVwiIDpcbiAgICAgICAgICAgICAgICAgIFwiW1wiICsgcmVzdWx0cy5qb2luKFwiLFwiKSArIFwiXVwiXG4gICAgICAgICAgICAgICAgKVxuICAgICAgICAgICAgICAgIDogXCJbXVwiO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgdmFyIHRvdGFsTGVuZ3RoID0gaW5kZW50YXRpb24ubGVuZ3RoLCBpbmRleD0wO1xuICAgICAgICAgICAgICAvLyBSZWN1cnNpdmVseSBzZXJpYWxpemUgb2JqZWN0IG1lbWJlcnMuIE1lbWJlcnMgYXJlIHNlbGVjdGVkIGZyb21cbiAgICAgICAgICAgICAgLy8gZWl0aGVyIGEgdXNlci1zcGVjaWZpZWQgbGlzdCBvZiBwcm9wZXJ0eSBuYW1lcywgb3IgdGhlIG9iamVjdFxuICAgICAgICAgICAgICAvLyBpdHNlbGYuXG4gICAgICAgICAgICAgIGZvckVhY2gocHJvcGVydGllcyB8fCB2YWx1ZSwgZnVuY3Rpb24gKHByb3BlcnR5KSB7XG4gICAgICAgICAgICAgICAgdmFyIHJlc3VsdCwgZWxlbWVudCA9IHNlcmlhbGl6ZShwcm9wZXJ0eSwgdmFsdWUsIGNhbGxiYWNrLCBwcm9wZXJ0aWVzLCB3aGl0ZXNwYWNlLCBpbmRlbnRhdGlvbixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBzdGFjaywgbWF4TGluZUxlbmd0aCk7XG5cbiAgICAgICAgICAgICAgICBpZiAoZWxlbWVudCAhPT0gdW5kZWYpIHtcbiAgICAgICAgICAgICAgICAgIC8vIEFjY29yZGluZyB0byBFUyA1LjEgc2VjdGlvbiAxNS4xMi4zOiBcIklmIGBnYXBgIHt3aGl0ZXNwYWNlfVxuICAgICAgICAgICAgICAgICAgLy8gaXMgbm90IHRoZSBlbXB0eSBzdHJpbmcsIGxldCBgbWVtYmVyYCB7cXVvdGUocHJvcGVydHkpICsgXCI6XCJ9XG4gICAgICAgICAgICAgICAgICAvLyBiZSB0aGUgY29uY2F0ZW5hdGlvbiBvZiBgbWVtYmVyYCBhbmQgdGhlIGBzcGFjZWAgY2hhcmFjdGVyLlwiXG4gICAgICAgICAgICAgICAgICAvLyBUaGUgXCJgc3BhY2VgIGNoYXJhY3RlclwiIHJlZmVycyB0byB0aGUgbGl0ZXJhbCBzcGFjZVxuICAgICAgICAgICAgICAgICAgLy8gY2hhcmFjdGVyLCBub3QgdGhlIGBzcGFjZWAge3dpZHRofSBhcmd1bWVudCBwcm92aWRlZCB0b1xuICAgICAgICAgICAgICAgICAgLy8gYEpTT04uc3RyaW5naWZ5YC5cbiAgICAgICAgICAgICAgICAgIHJlc3VsdCA9IHF1b3RlKHByb3BlcnR5KSArIFwiOlwiICsgKHdoaXRlc3BhY2UgPyBcIiBcIiA6IFwiXCIpICsgZWxlbWVudDtcbiAgICAgICAgICAgICAgICAgIHRvdGFsTGVuZ3RoICs9IHJlc3VsdC5sZW5ndGggKyAoaW5kZXgrKyA+IDAgPyAxIDogMCk7XG4gICAgICAgICAgICAgICAgICByZXN1bHRzLnB1c2gocmVzdWx0KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICByZXN1bHQgPSByZXN1bHRzLmxlbmd0aCA/XG4gICAgICAgICAgICAgICAgKFxuICAgICAgICAgICAgICAgICAgd2hpdGVzcGFjZSAmJiAodG90YWxMZW5ndGggPiBtYXhMaW5lTGVuZ3RoKSA/XG4gICAgICAgICAgICAgICAgICBcIntcXG5cIiArIGluZGVudGF0aW9uICsgcmVzdWx0cy5qb2luKFwiLFxcblwiICsgaW5kZW50YXRpb24pICsgXCJcXG5cIiArIHByZWZpeCArIFwifVwiIDpcbiAgICAgICAgICAgICAgICAgIFwie1wiICsgcmVzdWx0cy5qb2luKFwiLFwiKSArIFwifVwiXG4gICAgICAgICAgICAgICAgKVxuICAgICAgICAgICAgICAgIDogXCJ7fVwiO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgLy8gUmVtb3ZlIHRoZSBvYmplY3QgZnJvbSB0aGUgdHJhdmVyc2VkIG9iamVjdCBzdGFjay5cbiAgICAgICAgICAgIHN0YWNrLnBvcCgpO1xuICAgICAgICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICAgICAgICB9XG4gICAgICAgIH07XG5cbiAgICAgICAgLy8gUHVibGljOiBgSlNPTi5zdHJpbmdpZnlgLiBTZWUgRVMgNS4xIHNlY3Rpb24gMTUuMTIuMy5cblxuICAgICAgICBleHBvcnRzLnN0cmluZ2lmeSA9IGZ1bmN0aW9uIChzb3VyY2UsIGZpbHRlciwgd2lkdGgsIG1heExpbmVMZW5ndGgpIHtcbiAgICAgICAgICB2YXIgd2hpdGVzcGFjZSwgY2FsbGJhY2ssIHByb3BlcnRpZXMsIGNsYXNzTmFtZTtcbiAgICAgICAgICBpZiAob2JqZWN0VHlwZXNbdHlwZW9mIGZpbHRlcl0gJiYgZmlsdGVyKSB7XG4gICAgICAgICAgICBpZiAoKGNsYXNzTmFtZSA9IGdldENsYXNzLmNhbGwoZmlsdGVyKSkgPT0gZnVuY3Rpb25DbGFzcykge1xuICAgICAgICAgICAgICBjYWxsYmFjayA9IGZpbHRlcjtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAoY2xhc3NOYW1lID09IGFycmF5Q2xhc3MpIHtcbiAgICAgICAgICAgICAgLy8gQ29udmVydCB0aGUgcHJvcGVydHkgbmFtZXMgYXJyYXkgaW50byBhIG1ha2VzaGlmdCBzZXQuXG4gICAgICAgICAgICAgIHByb3BlcnRpZXMgPSB7fTtcbiAgICAgICAgICAgICAgZm9yICh2YXIgaW5kZXggPSAwLCBsZW5ndGggPSBmaWx0ZXIubGVuZ3RoLCB2YWx1ZTsgaW5kZXggPCBsZW5ndGg7IHZhbHVlID0gZmlsdGVyW2luZGV4KytdLCAoKGNsYXNzTmFtZSA9IGdldENsYXNzLmNhbGwodmFsdWUpKSwgY2xhc3NOYW1lID09IHN0cmluZ0NsYXNzIHx8IGNsYXNzTmFtZSA9PSBudW1iZXJDbGFzcykgJiYgKHByb3BlcnRpZXNbdmFsdWVdID0gMSkpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgICBpZiAod2lkdGgpIHtcbiAgICAgICAgICAgIGlmICgoY2xhc3NOYW1lID0gZ2V0Q2xhc3MuY2FsbCh3aWR0aCkpID09IG51bWJlckNsYXNzKSB7XG4gICAgICAgICAgICAgIC8vIENvbnZlcnQgdGhlIGB3aWR0aGAgdG8gYW4gaW50ZWdlciBhbmQgY3JlYXRlIGEgc3RyaW5nIGNvbnRhaW5pbmdcbiAgICAgICAgICAgICAgLy8gYHdpZHRoYCBudW1iZXIgb2Ygc3BhY2UgY2hhcmFjdGVycy5cbiAgICAgICAgICAgICAgaWYgKCh3aWR0aCAtPSB3aWR0aCAlIDEpID4gMCkge1xuICAgICAgICAgICAgICAgIGZvciAod2hpdGVzcGFjZSA9IFwiXCIsIHdpZHRoID4gMTAgJiYgKHdpZHRoID0gMTApOyB3aGl0ZXNwYWNlLmxlbmd0aCA8IHdpZHRoOyB3aGl0ZXNwYWNlICs9IFwiIFwiKTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBlbHNlIGlmIChjbGFzc05hbWUgPT0gc3RyaW5nQ2xhc3MpIHtcbiAgICAgICAgICAgICAgd2hpdGVzcGFjZSA9IHdpZHRoLmxlbmd0aCA8PSAxMCA/IHdpZHRoIDogd2lkdGguc2xpY2UoMCwgMTApO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgICAvLyBPcGVyYSA8PSA3LjU0dTIgZGlzY2FyZHMgdGhlIHZhbHVlcyBhc3NvY2lhdGVkIHdpdGggZW1wdHkgc3RyaW5nIGtleXNcbiAgICAgICAgICAvLyAoYFwiXCJgKSBvbmx5IGlmIHRoZXkgYXJlIHVzZWQgZGlyZWN0bHkgd2l0aGluIGFuIG9iamVjdCBtZW1iZXIgbGlzdFxuICAgICAgICAgIC8vIChlLmcuLCBgIShcIlwiIGluIHsgXCJcIjogMX0pYCkuXG4gICAgICAgICAgcmV0dXJuIHNlcmlhbGl6ZShcIlwiLCAodmFsdWUgPSB7fSwgdmFsdWVbXCJcIl0gPSBzb3VyY2UsIHZhbHVlKSwgY2FsbGJhY2ssIHByb3BlcnRpZXMsIHdoaXRlc3BhY2UsIFwiXCIsIFtdLCBtYXhMaW5lTGVuZ3RoKTtcbiAgICAgICAgfTtcblxuICAgICAgICBleHBvcnRzLmNvbXBhY3RTdHJpbmdpZnkgPSBmdW5jdGlvbiAoc291cmNlLCBmaWx0ZXIsIHdpZHRoKXtcbiAgICAgICAgICByZXR1cm4gZXhwb3J0cy5zdHJpbmdpZnkoc291cmNlLCBmaWx0ZXIsIHdpZHRoLCA2MCk7XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgLy8gUHVibGljOiBQYXJzZXMgYSBKU09OIHNvdXJjZSBzdHJpbmcuXG4gICAgICBpZiAoIWhhcyhcImpzb24tcGFyc2VcIikpIHtcbiAgICAgICAgdmFyIGZyb21DaGFyQ29kZSA9IFN0cmluZy5mcm9tQ2hhckNvZGU7XG5cbiAgICAgICAgLy8gSW50ZXJuYWw6IEEgbWFwIG9mIGVzY2FwZWQgY29udHJvbCBjaGFyYWN0ZXJzIGFuZCB0aGVpciB1bmVzY2FwZWRcbiAgICAgICAgLy8gZXF1aXZhbGVudHMuXG4gICAgICAgIHZhciBVbmVzY2FwZXMgPSB7XG4gICAgICAgICAgOTI6IFwiXFxcXFwiLFxuICAgICAgICAgIDM0OiAnXCInLFxuICAgICAgICAgIDQ3OiBcIi9cIixcbiAgICAgICAgICA5ODogXCJcXGJcIixcbiAgICAgICAgICAxMTY6IFwiXFx0XCIsXG4gICAgICAgICAgMTEwOiBcIlxcblwiLFxuICAgICAgICAgIDEwMjogXCJcXGZcIixcbiAgICAgICAgICAxMTQ6IFwiXFxyXCJcbiAgICAgICAgfTtcblxuICAgICAgICAvLyBJbnRlcm5hbDogU3RvcmVzIHRoZSBwYXJzZXIgc3RhdGUuXG4gICAgICAgIHZhciBJbmRleCwgU291cmNlO1xuXG4gICAgICAgIC8vIEludGVybmFsOiBSZXNldHMgdGhlIHBhcnNlciBzdGF0ZSBhbmQgdGhyb3dzIGEgYFN5bnRheEVycm9yYC5cbiAgICAgICAgdmFyIGFib3J0ID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgIEluZGV4ID0gU291cmNlID0gbnVsbDtcbiAgICAgICAgICB0aHJvdyBTeW50YXhFcnJvcigpO1xuICAgICAgICB9O1xuXG4gICAgICAgIC8vIEludGVybmFsOiBSZXR1cm5zIHRoZSBuZXh0IHRva2VuLCBvciBgXCIkXCJgIGlmIHRoZSBwYXJzZXIgaGFzIHJlYWNoZWRcbiAgICAgICAgLy8gdGhlIGVuZCBvZiB0aGUgc291cmNlIHN0cmluZy4gQSB0b2tlbiBtYXkgYmUgYSBzdHJpbmcsIG51bWJlciwgYG51bGxgXG4gICAgICAgIC8vIGxpdGVyYWwsIG9yIEJvb2xlYW4gbGl0ZXJhbC5cbiAgICAgICAgdmFyIGxleCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICB2YXIgc291cmNlID0gU291cmNlLCBsZW5ndGggPSBzb3VyY2UubGVuZ3RoLCB2YWx1ZSwgYmVnaW4sIHBvc2l0aW9uLCBpc1NpZ25lZCwgY2hhckNvZGU7XG4gICAgICAgICAgd2hpbGUgKEluZGV4IDwgbGVuZ3RoKSB7XG4gICAgICAgICAgICBjaGFyQ29kZSA9IHNvdXJjZS5jaGFyQ29kZUF0KEluZGV4KTtcbiAgICAgICAgICAgIHN3aXRjaCAoY2hhckNvZGUpIHtcbiAgICAgICAgICAgICAgY2FzZSA5OiBjYXNlIDEwOiBjYXNlIDEzOiBjYXNlIDMyOlxuICAgICAgICAgICAgICAgIC8vIFNraXAgd2hpdGVzcGFjZSB0b2tlbnMsIGluY2x1ZGluZyB0YWJzLCBjYXJyaWFnZSByZXR1cm5zLCBsaW5lXG4gICAgICAgICAgICAgICAgLy8gZmVlZHMsIGFuZCBzcGFjZSBjaGFyYWN0ZXJzLlxuICAgICAgICAgICAgICAgIEluZGV4Kys7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgIGNhc2UgMTIzOiBjYXNlIDEyNTogY2FzZSA5MTogY2FzZSA5MzogY2FzZSA1ODogY2FzZSA0NDpcbiAgICAgICAgICAgICAgICAvLyBQYXJzZSBhIHB1bmN0dWF0b3IgdG9rZW4gKGB7YCwgYH1gLCBgW2AsIGBdYCwgYDpgLCBvciBgLGApIGF0XG4gICAgICAgICAgICAgICAgLy8gdGhlIGN1cnJlbnQgcG9zaXRpb24uXG4gICAgICAgICAgICAgICAgdmFsdWUgPSBjaGFySW5kZXhCdWdneSA/IHNvdXJjZS5jaGFyQXQoSW5kZXgpIDogc291cmNlW0luZGV4XTtcbiAgICAgICAgICAgICAgICBJbmRleCsrO1xuICAgICAgICAgICAgICAgIHJldHVybiB2YWx1ZTtcbiAgICAgICAgICAgICAgY2FzZSAzNDpcbiAgICAgICAgICAgICAgICAvLyBgXCJgIGRlbGltaXRzIGEgSlNPTiBzdHJpbmc7IGFkdmFuY2UgdG8gdGhlIG5leHQgY2hhcmFjdGVyIGFuZFxuICAgICAgICAgICAgICAgIC8vIGJlZ2luIHBhcnNpbmcgdGhlIHN0cmluZy4gU3RyaW5nIHRva2VucyBhcmUgcHJlZml4ZWQgd2l0aCB0aGVcbiAgICAgICAgICAgICAgICAvLyBzZW50aW5lbCBgQGAgY2hhcmFjdGVyIHRvIGRpc3Rpbmd1aXNoIHRoZW0gZnJvbSBwdW5jdHVhdG9ycyBhbmRcbiAgICAgICAgICAgICAgICAvLyBlbmQtb2Ytc3RyaW5nIHRva2Vucy5cbiAgICAgICAgICAgICAgICBmb3IgKHZhbHVlID0gXCJAXCIsIEluZGV4Kys7IEluZGV4IDwgbGVuZ3RoOykge1xuICAgICAgICAgICAgICAgICAgY2hhckNvZGUgPSBzb3VyY2UuY2hhckNvZGVBdChJbmRleCk7XG4gICAgICAgICAgICAgICAgICBpZiAoY2hhckNvZGUgPCAzMikge1xuICAgICAgICAgICAgICAgICAgICAvLyBVbmVzY2FwZWQgQVNDSUkgY29udHJvbCBjaGFyYWN0ZXJzICh0aG9zZSB3aXRoIGEgY29kZSB1bml0XG4gICAgICAgICAgICAgICAgICAgIC8vIGxlc3MgdGhhbiB0aGUgc3BhY2UgY2hhcmFjdGVyKSBhcmUgbm90IHBlcm1pdHRlZC5cbiAgICAgICAgICAgICAgICAgICAgYWJvcnQoKTtcbiAgICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAoY2hhckNvZGUgPT0gOTIpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gQSByZXZlcnNlIHNvbGlkdXMgKGBcXGApIG1hcmtzIHRoZSBiZWdpbm5pbmcgb2YgYW4gZXNjYXBlZFxuICAgICAgICAgICAgICAgICAgICAvLyBjb250cm9sIGNoYXJhY3RlciAoaW5jbHVkaW5nIGBcImAsIGBcXGAsIGFuZCBgL2ApIG9yIFVuaWNvZGVcbiAgICAgICAgICAgICAgICAgICAgLy8gZXNjYXBlIHNlcXVlbmNlLlxuICAgICAgICAgICAgICAgICAgICBjaGFyQ29kZSA9IHNvdXJjZS5jaGFyQ29kZUF0KCsrSW5kZXgpO1xuICAgICAgICAgICAgICAgICAgICBzd2l0Y2ggKGNoYXJDb2RlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgY2FzZSA5MjogY2FzZSAzNDogY2FzZSA0NzogY2FzZSA5ODogY2FzZSAxMTY6IGNhc2UgMTEwOiBjYXNlIDEwMjogY2FzZSAxMTQ6XG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBSZXZpdmUgZXNjYXBlZCBjb250cm9sIGNoYXJhY3RlcnMuXG4gICAgICAgICAgICAgICAgICAgICAgICB2YWx1ZSArPSBVbmVzY2FwZXNbY2hhckNvZGVdO1xuICAgICAgICAgICAgICAgICAgICAgICAgSW5kZXgrKztcbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgICAgICAgIGNhc2UgMTE3OlxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gYFxcdWAgbWFya3MgdGhlIGJlZ2lubmluZyBvZiBhIFVuaWNvZGUgZXNjYXBlIHNlcXVlbmNlLlxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gQWR2YW5jZSB0byB0aGUgZmlyc3QgY2hhcmFjdGVyIGFuZCB2YWxpZGF0ZSB0aGVcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIGZvdXItZGlnaXQgY29kZSBwb2ludC5cbiAgICAgICAgICAgICAgICAgICAgICAgIGJlZ2luID0gKytJbmRleDtcbiAgICAgICAgICAgICAgICAgICAgICAgIGZvciAocG9zaXRpb24gPSBJbmRleCArIDQ7IEluZGV4IDwgcG9zaXRpb247IEluZGV4KyspIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgY2hhckNvZGUgPSBzb3VyY2UuY2hhckNvZGVBdChJbmRleCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgIC8vIEEgdmFsaWQgc2VxdWVuY2UgY29tcHJpc2VzIGZvdXIgaGV4ZGlnaXRzIChjYXNlLVxuICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBpbnNlbnNpdGl2ZSkgdGhhdCBmb3JtIGEgc2luZ2xlIGhleGFkZWNpbWFsIHZhbHVlLlxuICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoIShjaGFyQ29kZSA+PSA0OCAmJiBjaGFyQ29kZSA8PSA1NyB8fCBjaGFyQ29kZSA+PSA5NyAmJiBjaGFyQ29kZSA8PSAxMDIgfHwgY2hhckNvZGUgPj0gNjUgJiYgY2hhckNvZGUgPD0gNzApKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gSW52YWxpZCBVbmljb2RlIGVzY2FwZSBzZXF1ZW5jZS5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBhYm9ydCgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBSZXZpdmUgdGhlIGVzY2FwZWQgY2hhcmFjdGVyLlxuICAgICAgICAgICAgICAgICAgICAgICAgdmFsdWUgKz0gZnJvbUNoYXJDb2RlKFwiMHhcIiArIHNvdXJjZS5zbGljZShiZWdpbiwgSW5kZXgpKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBJbnZhbGlkIGVzY2FwZSBzZXF1ZW5jZS5cbiAgICAgICAgICAgICAgICAgICAgICAgIGFib3J0KCk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChjaGFyQ29kZSA9PSAzNCkge1xuICAgICAgICAgICAgICAgICAgICAgIC8vIEFuIHVuZXNjYXBlZCBkb3VibGUtcXVvdGUgY2hhcmFjdGVyIG1hcmtzIHRoZSBlbmQgb2YgdGhlXG4gICAgICAgICAgICAgICAgICAgICAgLy8gc3RyaW5nLlxuICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGNoYXJDb2RlID0gc291cmNlLmNoYXJDb2RlQXQoSW5kZXgpO1xuICAgICAgICAgICAgICAgICAgICBiZWdpbiA9IEluZGV4O1xuICAgICAgICAgICAgICAgICAgICAvLyBPcHRpbWl6ZSBmb3IgdGhlIGNvbW1vbiBjYXNlIHdoZXJlIGEgc3RyaW5nIGlzIHZhbGlkLlxuICAgICAgICAgICAgICAgICAgICB3aGlsZSAoY2hhckNvZGUgPj0gMzIgJiYgY2hhckNvZGUgIT0gOTIgJiYgY2hhckNvZGUgIT0gMzQpIHtcbiAgICAgICAgICAgICAgICAgICAgICBjaGFyQ29kZSA9IHNvdXJjZS5jaGFyQ29kZUF0KCsrSW5kZXgpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIC8vIEFwcGVuZCB0aGUgc3RyaW5nIGFzLWlzLlxuICAgICAgICAgICAgICAgICAgICB2YWx1ZSArPSBzb3VyY2Uuc2xpY2UoYmVnaW4sIEluZGV4KTtcbiAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgaWYgKHNvdXJjZS5jaGFyQ29kZUF0KEluZGV4KSA9PSAzNCkge1xuICAgICAgICAgICAgICAgICAgLy8gQWR2YW5jZSB0byB0aGUgbmV4dCBjaGFyYWN0ZXIgYW5kIHJldHVybiB0aGUgcmV2aXZlZCBzdHJpbmcuXG4gICAgICAgICAgICAgICAgICBJbmRleCsrO1xuICAgICAgICAgICAgICAgICAgcmV0dXJuIHZhbHVlO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAvLyBVbnRlcm1pbmF0ZWQgc3RyaW5nLlxuICAgICAgICAgICAgICAgIGFib3J0KCk7XG4gICAgICAgICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICAgICAgLy8gUGFyc2UgbnVtYmVycyBhbmQgbGl0ZXJhbHMuXG4gICAgICAgICAgICAgICAgYmVnaW4gPSBJbmRleDtcbiAgICAgICAgICAgICAgICAvLyBBZHZhbmNlIHBhc3QgdGhlIG5lZ2F0aXZlIHNpZ24sIGlmIG9uZSBpcyBzcGVjaWZpZWQuXG4gICAgICAgICAgICAgICAgaWYgKGNoYXJDb2RlID09IDQ1KSB7XG4gICAgICAgICAgICAgICAgICBpc1NpZ25lZCA9IHRydWU7XG4gICAgICAgICAgICAgICAgICBjaGFyQ29kZSA9IHNvdXJjZS5jaGFyQ29kZUF0KCsrSW5kZXgpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAvLyBQYXJzZSBhbiBpbnRlZ2VyIG9yIGZsb2F0aW5nLXBvaW50IHZhbHVlLlxuICAgICAgICAgICAgICAgIGlmIChjaGFyQ29kZSA+PSA0OCAmJiBjaGFyQ29kZSA8PSA1Nykge1xuICAgICAgICAgICAgICAgICAgLy8gTGVhZGluZyB6ZXJvZXMgYXJlIGludGVycHJldGVkIGFzIG9jdGFsIGxpdGVyYWxzLlxuICAgICAgICAgICAgICAgICAgaWYgKGNoYXJDb2RlID09IDQ4ICYmICgoY2hhckNvZGUgPSBzb3VyY2UuY2hhckNvZGVBdChJbmRleCArIDEpKSwgY2hhckNvZGUgPj0gNDggJiYgY2hhckNvZGUgPD0gNTcpKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIElsbGVnYWwgb2N0YWwgbGl0ZXJhbC5cbiAgICAgICAgICAgICAgICAgICAgYWJvcnQoKTtcbiAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgIGlzU2lnbmVkID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgICAvLyBQYXJzZSB0aGUgaW50ZWdlciBjb21wb25lbnQuXG4gICAgICAgICAgICAgICAgICBmb3IgKDsgSW5kZXggPCBsZW5ndGggJiYgKChjaGFyQ29kZSA9IHNvdXJjZS5jaGFyQ29kZUF0KEluZGV4KSksIGNoYXJDb2RlID49IDQ4ICYmIGNoYXJDb2RlIDw9IDU3KTsgSW5kZXgrKyk7XG4gICAgICAgICAgICAgICAgICAvLyBGbG9hdHMgY2Fubm90IGNvbnRhaW4gYSBsZWFkaW5nIGRlY2ltYWwgcG9pbnQ7IGhvd2V2ZXIsIHRoaXNcbiAgICAgICAgICAgICAgICAgIC8vIGNhc2UgaXMgYWxyZWFkeSBhY2NvdW50ZWQgZm9yIGJ5IHRoZSBwYXJzZXIuXG4gICAgICAgICAgICAgICAgICBpZiAoc291cmNlLmNoYXJDb2RlQXQoSW5kZXgpID09IDQ2KSB7XG4gICAgICAgICAgICAgICAgICAgIHBvc2l0aW9uID0gKytJbmRleDtcbiAgICAgICAgICAgICAgICAgICAgLy8gUGFyc2UgdGhlIGRlY2ltYWwgY29tcG9uZW50LlxuICAgICAgICAgICAgICAgICAgICBmb3IgKDsgcG9zaXRpb24gPCBsZW5ndGggJiYgKChjaGFyQ29kZSA9IHNvdXJjZS5jaGFyQ29kZUF0KHBvc2l0aW9uKSksIGNoYXJDb2RlID49IDQ4ICYmIGNoYXJDb2RlIDw9IDU3KTsgcG9zaXRpb24rKyk7XG4gICAgICAgICAgICAgICAgICAgIGlmIChwb3NpdGlvbiA9PSBJbmRleCkge1xuICAgICAgICAgICAgICAgICAgICAgIC8vIElsbGVnYWwgdHJhaWxpbmcgZGVjaW1hbC5cbiAgICAgICAgICAgICAgICAgICAgICBhYm9ydCgpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIEluZGV4ID0gcG9zaXRpb247XG4gICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAvLyBQYXJzZSBleHBvbmVudHMuIFRoZSBgZWAgZGVub3RpbmcgdGhlIGV4cG9uZW50IGlzXG4gICAgICAgICAgICAgICAgICAvLyBjYXNlLWluc2Vuc2l0aXZlLlxuICAgICAgICAgICAgICAgICAgY2hhckNvZGUgPSBzb3VyY2UuY2hhckNvZGVBdChJbmRleCk7XG4gICAgICAgICAgICAgICAgICBpZiAoY2hhckNvZGUgPT0gMTAxIHx8IGNoYXJDb2RlID09IDY5KSB7XG4gICAgICAgICAgICAgICAgICAgIGNoYXJDb2RlID0gc291cmNlLmNoYXJDb2RlQXQoKytJbmRleCk7XG4gICAgICAgICAgICAgICAgICAgIC8vIFNraXAgcGFzdCB0aGUgc2lnbiBmb2xsb3dpbmcgdGhlIGV4cG9uZW50LCBpZiBvbmUgaXNcbiAgICAgICAgICAgICAgICAgICAgLy8gc3BlY2lmaWVkLlxuICAgICAgICAgICAgICAgICAgICBpZiAoY2hhckNvZGUgPT0gNDMgfHwgY2hhckNvZGUgPT0gNDUpIHtcbiAgICAgICAgICAgICAgICAgICAgICBJbmRleCsrO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIC8vIFBhcnNlIHRoZSBleHBvbmVudGlhbCBjb21wb25lbnQuXG4gICAgICAgICAgICAgICAgICAgIGZvciAocG9zaXRpb24gPSBJbmRleDsgcG9zaXRpb24gPCBsZW5ndGggJiYgKChjaGFyQ29kZSA9IHNvdXJjZS5jaGFyQ29kZUF0KHBvc2l0aW9uKSksIGNoYXJDb2RlID49IDQ4ICYmIGNoYXJDb2RlIDw9IDU3KTsgcG9zaXRpb24rKyk7XG4gICAgICAgICAgICAgICAgICAgIGlmIChwb3NpdGlvbiA9PSBJbmRleCkge1xuICAgICAgICAgICAgICAgICAgICAgIC8vIElsbGVnYWwgZW1wdHkgZXhwb25lbnQuXG4gICAgICAgICAgICAgICAgICAgICAgYWJvcnQoKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBJbmRleCA9IHBvc2l0aW9uO1xuICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgLy8gQ29lcmNlIHRoZSBwYXJzZWQgdmFsdWUgdG8gYSBKYXZhU2NyaXB0IG51bWJlci5cbiAgICAgICAgICAgICAgICAgIHJldHVybiArc291cmNlLnNsaWNlKGJlZ2luLCBJbmRleCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIC8vIEEgbmVnYXRpdmUgc2lnbiBtYXkgb25seSBwcmVjZWRlIG51bWJlcnMuXG4gICAgICAgICAgICAgICAgaWYgKGlzU2lnbmVkKSB7XG4gICAgICAgICAgICAgICAgICBhYm9ydCgpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAvLyBgdHJ1ZWAsIGBmYWxzZWAsIGFuZCBgbnVsbGAgbGl0ZXJhbHMuXG4gICAgICAgICAgICAgICAgaWYgKHNvdXJjZS5zbGljZShJbmRleCwgSW5kZXggKyA0KSA9PSBcInRydWVcIikge1xuICAgICAgICAgICAgICAgICAgSW5kZXggKz0gNDtcbiAgICAgICAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAoc291cmNlLnNsaWNlKEluZGV4LCBJbmRleCArIDUpID09IFwiZmFsc2VcIikge1xuICAgICAgICAgICAgICAgICAgSW5kZXggKz0gNTtcbiAgICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKHNvdXJjZS5zbGljZShJbmRleCwgSW5kZXggKyA0KSA9PSBcIm51bGxcIikge1xuICAgICAgICAgICAgICAgICAgSW5kZXggKz0gNDtcbiAgICAgICAgICAgICAgICAgIHJldHVybiBudWxsO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAvLyBVbnJlY29nbml6ZWQgdG9rZW4uXG4gICAgICAgICAgICAgICAgYWJvcnQoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgICAgLy8gUmV0dXJuIHRoZSBzZW50aW5lbCBgJGAgY2hhcmFjdGVyIGlmIHRoZSBwYXJzZXIgaGFzIHJlYWNoZWQgdGhlIGVuZFxuICAgICAgICAgIC8vIG9mIHRoZSBzb3VyY2Ugc3RyaW5nLlxuICAgICAgICAgIHJldHVybiBcIiRcIjtcbiAgICAgICAgfTtcblxuICAgICAgICAvLyBJbnRlcm5hbDogUGFyc2VzIGEgSlNPTiBgdmFsdWVgIHRva2VuLlxuICAgICAgICB2YXIgZ2V0ID0gZnVuY3Rpb24gKHZhbHVlKSB7XG4gICAgICAgICAgdmFyIHJlc3VsdHMsIGhhc01lbWJlcnM7XG4gICAgICAgICAgaWYgKHZhbHVlID09IFwiJFwiKSB7XG4gICAgICAgICAgICAvLyBVbmV4cGVjdGVkIGVuZCBvZiBpbnB1dC5cbiAgICAgICAgICAgIGFib3J0KCk7XG4gICAgICAgICAgfVxuICAgICAgICAgIGlmICh0eXBlb2YgdmFsdWUgPT0gXCJzdHJpbmdcIikge1xuICAgICAgICAgICAgaWYgKChjaGFySW5kZXhCdWdneSA/IHZhbHVlLmNoYXJBdCgwKSA6IHZhbHVlWzBdKSA9PSBcIkBcIikge1xuICAgICAgICAgICAgICAvLyBSZW1vdmUgdGhlIHNlbnRpbmVsIGBAYCBjaGFyYWN0ZXIuXG4gICAgICAgICAgICAgIHJldHVybiB2YWx1ZS5zbGljZSgxKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIC8vIFBhcnNlIG9iamVjdCBhbmQgYXJyYXkgbGl0ZXJhbHMuXG4gICAgICAgICAgICBpZiAodmFsdWUgPT0gXCJbXCIpIHtcbiAgICAgICAgICAgICAgLy8gUGFyc2VzIGEgSlNPTiBhcnJheSwgcmV0dXJuaW5nIGEgbmV3IEphdmFTY3JpcHQgYXJyYXkuXG4gICAgICAgICAgICAgIHJlc3VsdHMgPSBbXTtcbiAgICAgICAgICAgICAgZm9yICg7OyBoYXNNZW1iZXJzIHx8IChoYXNNZW1iZXJzID0gdHJ1ZSkpIHtcbiAgICAgICAgICAgICAgICB2YWx1ZSA9IGxleCgpO1xuICAgICAgICAgICAgICAgIC8vIEEgY2xvc2luZyBzcXVhcmUgYnJhY2tldCBtYXJrcyB0aGUgZW5kIG9mIHRoZSBhcnJheSBsaXRlcmFsLlxuICAgICAgICAgICAgICAgIGlmICh2YWx1ZSA9PSBcIl1cIikge1xuICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIC8vIElmIHRoZSBhcnJheSBsaXRlcmFsIGNvbnRhaW5zIGVsZW1lbnRzLCB0aGUgY3VycmVudCB0b2tlblxuICAgICAgICAgICAgICAgIC8vIHNob3VsZCBiZSBhIGNvbW1hIHNlcGFyYXRpbmcgdGhlIHByZXZpb3VzIGVsZW1lbnQgZnJvbSB0aGVcbiAgICAgICAgICAgICAgICAvLyBuZXh0LlxuICAgICAgICAgICAgICAgIGlmIChoYXNNZW1iZXJzKSB7XG4gICAgICAgICAgICAgICAgICBpZiAodmFsdWUgPT0gXCIsXCIpIHtcbiAgICAgICAgICAgICAgICAgICAgdmFsdWUgPSBsZXgoKTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHZhbHVlID09IFwiXVwiKSB7XG4gICAgICAgICAgICAgICAgICAgICAgLy8gVW5leHBlY3RlZCB0cmFpbGluZyBgLGAgaW4gYXJyYXkgbGl0ZXJhbC5cbiAgICAgICAgICAgICAgICAgICAgICBhYm9ydCgpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAvLyBBIGAsYCBtdXN0IHNlcGFyYXRlIGVhY2ggYXJyYXkgZWxlbWVudC5cbiAgICAgICAgICAgICAgICAgICAgYWJvcnQoKTtcbiAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgLy8gRWxpc2lvbnMgYW5kIGxlYWRpbmcgY29tbWFzIGFyZSBub3QgcGVybWl0dGVkLlxuICAgICAgICAgICAgICAgIGlmICh2YWx1ZSA9PSBcIixcIikge1xuICAgICAgICAgICAgICAgICAgYWJvcnQoKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgcmVzdWx0cy5wdXNoKGdldCh2YWx1ZSkpO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIHJldHVybiByZXN1bHRzO1xuICAgICAgICAgICAgfSBlbHNlIGlmICh2YWx1ZSA9PSBcIntcIikge1xuICAgICAgICAgICAgICAvLyBQYXJzZXMgYSBKU09OIG9iamVjdCwgcmV0dXJuaW5nIGEgbmV3IEphdmFTY3JpcHQgb2JqZWN0LlxuICAgICAgICAgICAgICByZXN1bHRzID0ge307XG4gICAgICAgICAgICAgIGZvciAoOzsgaGFzTWVtYmVycyB8fCAoaGFzTWVtYmVycyA9IHRydWUpKSB7XG4gICAgICAgICAgICAgICAgdmFsdWUgPSBsZXgoKTtcbiAgICAgICAgICAgICAgICAvLyBBIGNsb3NpbmcgY3VybHkgYnJhY2UgbWFya3MgdGhlIGVuZCBvZiB0aGUgb2JqZWN0IGxpdGVyYWwuXG4gICAgICAgICAgICAgICAgaWYgKHZhbHVlID09IFwifVwiKSB7XG4gICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgLy8gSWYgdGhlIG9iamVjdCBsaXRlcmFsIGNvbnRhaW5zIG1lbWJlcnMsIHRoZSBjdXJyZW50IHRva2VuXG4gICAgICAgICAgICAgICAgLy8gc2hvdWxkIGJlIGEgY29tbWEgc2VwYXJhdG9yLlxuICAgICAgICAgICAgICAgIGlmIChoYXNNZW1iZXJzKSB7XG4gICAgICAgICAgICAgICAgICBpZiAodmFsdWUgPT0gXCIsXCIpIHtcbiAgICAgICAgICAgICAgICAgICAgdmFsdWUgPSBsZXgoKTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHZhbHVlID09IFwifVwiKSB7XG4gICAgICAgICAgICAgICAgICAgICAgLy8gVW5leHBlY3RlZCB0cmFpbGluZyBgLGAgaW4gb2JqZWN0IGxpdGVyYWwuXG4gICAgICAgICAgICAgICAgICAgICAgYWJvcnQoKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gQSBgLGAgbXVzdCBzZXBhcmF0ZSBlYWNoIG9iamVjdCBtZW1iZXIuXG4gICAgICAgICAgICAgICAgICAgIGFib3J0KCk7XG4gICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIC8vIExlYWRpbmcgY29tbWFzIGFyZSBub3QgcGVybWl0dGVkLCBvYmplY3QgcHJvcGVydHkgbmFtZXMgbXVzdCBiZVxuICAgICAgICAgICAgICAgIC8vIGRvdWJsZS1xdW90ZWQgc3RyaW5ncywgYW5kIGEgYDpgIG11c3Qgc2VwYXJhdGUgZWFjaCBwcm9wZXJ0eVxuICAgICAgICAgICAgICAgIC8vIG5hbWUgYW5kIHZhbHVlLlxuICAgICAgICAgICAgICAgIGlmICh2YWx1ZSA9PSBcIixcIiB8fCB0eXBlb2YgdmFsdWUgIT0gXCJzdHJpbmdcIiB8fCAoY2hhckluZGV4QnVnZ3kgPyB2YWx1ZS5jaGFyQXQoMCkgOiB2YWx1ZVswXSkgIT0gXCJAXCIgfHwgbGV4KCkgIT0gXCI6XCIpIHtcbiAgICAgICAgICAgICAgICAgIGFib3J0KCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHJlc3VsdHNbdmFsdWUuc2xpY2UoMSldID0gZ2V0KGxleCgpKTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICByZXR1cm4gcmVzdWx0cztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIC8vIFVuZXhwZWN0ZWQgdG9rZW4gZW5jb3VudGVyZWQuXG4gICAgICAgICAgICBhYm9ydCgpO1xuICAgICAgICAgIH1cbiAgICAgICAgICByZXR1cm4gdmFsdWU7XG4gICAgICAgIH07XG5cbiAgICAgICAgLy8gSW50ZXJuYWw6IFVwZGF0ZXMgYSB0cmF2ZXJzZWQgb2JqZWN0IG1lbWJlci5cbiAgICAgICAgdmFyIHVwZGF0ZSA9IGZ1bmN0aW9uIChzb3VyY2UsIHByb3BlcnR5LCBjYWxsYmFjaykge1xuICAgICAgICAgIHZhciBlbGVtZW50ID0gd2Fsayhzb3VyY2UsIHByb3BlcnR5LCBjYWxsYmFjayk7XG4gICAgICAgICAgaWYgKGVsZW1lbnQgPT09IHVuZGVmKSB7XG4gICAgICAgICAgICBkZWxldGUgc291cmNlW3Byb3BlcnR5XTtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgc291cmNlW3Byb3BlcnR5XSA9IGVsZW1lbnQ7XG4gICAgICAgICAgfVxuICAgICAgICB9O1xuXG4gICAgICAgIC8vIEludGVybmFsOiBSZWN1cnNpdmVseSB0cmF2ZXJzZXMgYSBwYXJzZWQgSlNPTiBvYmplY3QsIGludm9raW5nIHRoZVxuICAgICAgICAvLyBgY2FsbGJhY2tgIGZ1bmN0aW9uIGZvciBlYWNoIHZhbHVlLiBUaGlzIGlzIGFuIGltcGxlbWVudGF0aW9uIG9mIHRoZVxuICAgICAgICAvLyBgV2Fsayhob2xkZXIsIG5hbWUpYCBvcGVyYXRpb24gZGVmaW5lZCBpbiBFUyA1LjEgc2VjdGlvbiAxNS4xMi4yLlxuICAgICAgICB2YXIgd2FsayA9IGZ1bmN0aW9uIChzb3VyY2UsIHByb3BlcnR5LCBjYWxsYmFjaykge1xuICAgICAgICAgIHZhciB2YWx1ZSA9IHNvdXJjZVtwcm9wZXJ0eV0sIGxlbmd0aDtcbiAgICAgICAgICBpZiAodHlwZW9mIHZhbHVlID09IFwib2JqZWN0XCIgJiYgdmFsdWUpIHtcbiAgICAgICAgICAgIC8vIGBmb3JFYWNoYCBjYW4ndCBiZSB1c2VkIHRvIHRyYXZlcnNlIGFuIGFycmF5IGluIE9wZXJhIDw9IDguNTRcbiAgICAgICAgICAgIC8vIGJlY2F1c2UgaXRzIGBPYmplY3QjaGFzT3duUHJvcGVydHlgIGltcGxlbWVudGF0aW9uIHJldHVybnMgYGZhbHNlYFxuICAgICAgICAgICAgLy8gZm9yIGFycmF5IGluZGljZXMgKGUuZy4sIGAhWzEsIDIsIDNdLmhhc093blByb3BlcnR5KFwiMFwiKWApLlxuICAgICAgICAgICAgaWYgKGdldENsYXNzLmNhbGwodmFsdWUpID09IGFycmF5Q2xhc3MpIHtcbiAgICAgICAgICAgICAgZm9yIChsZW5ndGggPSB2YWx1ZS5sZW5ndGg7IGxlbmd0aC0tOykge1xuICAgICAgICAgICAgICAgIHVwZGF0ZSh2YWx1ZSwgbGVuZ3RoLCBjYWxsYmFjayk7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgIGZvckVhY2godmFsdWUsIGZ1bmN0aW9uIChwcm9wZXJ0eSkge1xuICAgICAgICAgICAgICAgIHVwZGF0ZSh2YWx1ZSwgcHJvcGVydHksIGNhbGxiYWNrKTtcbiAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICAgIHJldHVybiBjYWxsYmFjay5jYWxsKHNvdXJjZSwgcHJvcGVydHksIHZhbHVlKTtcbiAgICAgICAgfTtcblxuICAgICAgICAvLyBQdWJsaWM6IGBKU09OLnBhcnNlYC4gU2VlIEVTIDUuMSBzZWN0aW9uIDE1LjEyLjIuXG4gICAgICAgIGV4cG9ydHMucGFyc2UgPSBmdW5jdGlvbiAoc291cmNlLCBjYWxsYmFjaykge1xuICAgICAgICAgIHZhciByZXN1bHQsIHZhbHVlO1xuICAgICAgICAgIEluZGV4ID0gMDtcbiAgICAgICAgICBTb3VyY2UgPSBcIlwiICsgc291cmNlO1xuICAgICAgICAgIHJlc3VsdCA9IGdldChsZXgoKSk7XG4gICAgICAgICAgLy8gSWYgYSBKU09OIHN0cmluZyBjb250YWlucyBtdWx0aXBsZSB0b2tlbnMsIGl0IGlzIGludmFsaWQuXG4gICAgICAgICAgaWYgKGxleCgpICE9IFwiJFwiKSB7XG4gICAgICAgICAgICBhYm9ydCgpO1xuICAgICAgICAgIH1cbiAgICAgICAgICAvLyBSZXNldCB0aGUgcGFyc2VyIHN0YXRlLlxuICAgICAgICAgIEluZGV4ID0gU291cmNlID0gbnVsbDtcbiAgICAgICAgICByZXR1cm4gY2FsbGJhY2sgJiYgZ2V0Q2xhc3MuY2FsbChjYWxsYmFjaykgPT0gZnVuY3Rpb25DbGFzcyA/IHdhbGsoKHZhbHVlID0ge30sIHZhbHVlW1wiXCJdID0gcmVzdWx0LCB2YWx1ZSksIFwiXCIsIGNhbGxiYWNrKSA6IHJlc3VsdDtcbiAgICAgICAgfTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBleHBvcnRzW1wicnVuSW5Db250ZXh0XCJdID0gcnVuSW5Db250ZXh0O1xuICAgIHJldHVybiBleHBvcnRzO1xuICB9XG5cbiAgaWYgKGZyZWVFeHBvcnRzICYmICFpc0xvYWRlcikge1xuICAgIC8vIEV4cG9ydCBmb3IgQ29tbW9uSlMgZW52aXJvbm1lbnRzLlxuICAgIHJ1bkluQ29udGV4dChyb290LCBmcmVlRXhwb3J0cyk7XG4gIH0gZWxzZSB7XG4gICAgLy8gRXhwb3J0IGZvciB3ZWIgYnJvd3NlcnMgYW5kIEphdmFTY3JpcHQgZW5naW5lcy5cbiAgICB2YXIgbmF0aXZlSlNPTiA9IHJvb3QuSlNPTixcbiAgICAgICAgcHJldmlvdXNKU09OID0gcm9vdFtcIkpTT04zXCJdLFxuICAgICAgICBpc1Jlc3RvcmVkID0gZmFsc2U7XG5cbiAgICB2YXIgSlNPTjMgPSBydW5JbkNvbnRleHQocm9vdCwgKHJvb3RbXCJKU09OM1wiXSA9IHtcbiAgICAgIC8vIFB1YmxpYzogUmVzdG9yZXMgdGhlIG9yaWdpbmFsIHZhbHVlIG9mIHRoZSBnbG9iYWwgYEpTT05gIG9iamVjdCBhbmRcbiAgICAgIC8vIHJldHVybnMgYSByZWZlcmVuY2UgdG8gdGhlIGBKU09OM2Agb2JqZWN0LlxuICAgICAgXCJub0NvbmZsaWN0XCI6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgaWYgKCFpc1Jlc3RvcmVkKSB7XG4gICAgICAgICAgaXNSZXN0b3JlZCA9IHRydWU7XG4gICAgICAgICAgcm9vdC5KU09OID0gbmF0aXZlSlNPTjtcbiAgICAgICAgICByb290W1wiSlNPTjNcIl0gPSBwcmV2aW91c0pTT047XG4gICAgICAgICAgbmF0aXZlSlNPTiA9IHByZXZpb3VzSlNPTiA9IG51bGw7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIEpTT04zO1xuICAgICAgfVxuICAgIH0pKTtcblxuICAgIHJvb3QuSlNPTiA9IHtcbiAgICAgIFwicGFyc2VcIjogSlNPTjMucGFyc2UsXG4gICAgICBcInN0cmluZ2lmeVwiOiBKU09OMy5zdHJpbmdpZnlcbiAgICB9O1xuICB9XG5cbiAgLy8gRXhwb3J0IGZvciBhc3luY2hyb25vdXMgbW9kdWxlIGxvYWRlcnMuXG4gIGlmIChpc0xvYWRlcikge1xuICAgIGRlZmluZShmdW5jdGlvbiAoKSB7XG4gICAgICByZXR1cm4gSlNPTjM7XG4gICAgfSk7XG4gIH1cbn0pLmNhbGwodGhpcyk7XG4iLCIndXNlIHN0cmljdCc7XG4vKiBnbG9iYWxzIHdpbmRvdywgYW5ndWxhciAqL1xuXG5hbmd1bGFyLm1vZHVsZSgndmx1aScsIFtcbiAgJ0xvY2FsU3RvcmFnZU1vZHVsZScsXG4gICdhbmd1bGFyLWdvb2dsZS1hbmFseXRpY3MnXG4gIF0pXG4gIC5jb25zdGFudCgnXycsIHdpbmRvdy5fKVxuICAvLyBkYXRhbGliLCB2ZWdhbGl0ZSwgdmVnYVxuICAuY29uc3RhbnQoJ2RsJywgd2luZG93LmRsKVxuICAuY29uc3RhbnQoJ3ZsJywgd2luZG93LnZsKVxuICAuY29uc3RhbnQoJ3ZnJywgd2luZG93LnZnKVxuICAvLyBvdGhlciBsaWJyYXJpZXNcbiAgLmNvbnN0YW50KCdCbG9iJywgd2luZG93LkJsb2IpXG4gIC5jb25zdGFudCgnVVJMJywgd2luZG93LlVSTClcbiAgLmNvbnN0YW50KCdEcm9wJywgd2luZG93LkRyb3ApXG4gIC5jb25zdGFudCgnSGVhcCcsIHdpbmRvdy5IZWFwKVxuICAvLyBVc2UgdGhlIGN1c3RvbWl6ZWQgdmVuZG9yL2pzb24zLWNvbXBhY3RzdHJpbmdpZnlcbiAgLmNvbnN0YW50KCdKU09OMycsIHdpbmRvdy5KU09OMy5ub0NvbmZsaWN0KCkpXG4gIC8vIGNvbnN0YW50c1xuICAuY29uc3RhbnQoJ2NvbnN0cycsIHtcbiAgICBhZGRDb3VudDogdHJ1ZSwgLy8gYWRkIGNvdW50IGZpZWxkIHRvIERhdGFzZXQuZGF0YXNjaGVtYVxuICAgIGRlYnVnOiB0cnVlLFxuICAgIHVzZVVybDogdHJ1ZSxcbiAgICBsb2dnaW5nOiB0cnVlLFxuICAgIGRlZmF1bHRDb25maWdTZXQ6ICdsYXJnZScsXG4gICAgYXBwSWQ6ICd2bHVpJyxcbiAgICAvLyBlbWJlZGRlZCBwb2xlc3RhciBhbmQgdm95YWdlciB3aXRoIGtub3duIGRhdGFcbiAgICBlbWJlZGRlZERhdGE6IHdpbmRvdy52Z3VpRGF0YSB8fCB1bmRlZmluZWQsXG4gICAgcHJpb3JpdHk6IHtcbiAgICAgIGJvb2ttYXJrOiAwLFxuICAgICAgcG9wdXA6IDAsXG4gICAgICB2aXNsaXN0OiAxMDAwXG4gICAgfSxcbiAgICBteXJpYVJlc3Q6ICdodHRwOi8vZWMyLTUyLTEtMzgtMTgyLmNvbXB1dGUtMS5hbWF6b25hd3MuY29tOjg3NTMnLFxuICAgIHR5cGVOYW1lczoge1xuICAgICAgTjogJ3RleHQnLFxuICAgICAgTzogJ3RleHQtb3JkaW5hbCcsXG4gICAgICBROiAnbnVtYmVyJyxcbiAgICAgIFQ6ICd0aW1lJyxcbiAgICAgIEc6ICdnZW8nXG4gICAgfVxuICB9KVxuICAuY29uZmlnKGZ1bmN0aW9uIChBbmFseXRpY3NQcm92aWRlcikge1xuICAgIEFuYWx5dGljc1Byb3ZpZGVyXG4gICAgICAuc2V0QWNjb3VudCh7IHRyYWNrZXI6ICdVQS00NDQyODQ0Ni00JywgbmFtZTogJ3ZveWFnZXInLCB0cmFja0V2ZW50OiB0cnVlIH0pO1xuICB9KTtcbiIsImFuZ3VsYXIubW9kdWxlKFwidmx1aVwiKS5ydW4oW1wiJHRlbXBsYXRlQ2FjaGVcIiwgZnVuY3Rpb24oJHRlbXBsYXRlQ2FjaGUpIHskdGVtcGxhdGVDYWNoZS5wdXQoXCJhbGVydG1lc3NhZ2VzL2FsZXJ0bWVzc2FnZXMuaHRtbFwiLFwiPGRpdiBjbGFzcz1cXFwiYWxlcnQtYm94XFxcIiBuZy1zaG93PVxcXCJBbGVydHMuYWxlcnRzLmxlbmd0aCA+IDBcXFwiPjxkaXYgY2xhc3M9XFxcImFsZXJ0LWl0ZW1cXFwiIG5nLXJlcGVhdD1cXFwiYWxlcnQgaW4gQWxlcnRzLmFsZXJ0c1xcXCI+e3sgYWxlcnQubXNnIH19IDxhIGNsYXNzPVxcXCJjbG9zZVxcXCIgbmctY2xpY2s9XFxcIkFsZXJ0cy5jbG9zZUFsZXJ0KCRpbmRleClcXFwiPiZ0aW1lczs8L2E+PC9kaXY+PC9kaXY+XCIpO1xuJHRlbXBsYXRlQ2FjaGUucHV0KFwiYm9va21hcmtsaXN0L2Jvb2ttYXJrbGlzdC5odG1sXCIsXCI8bW9kYWwgaWQ9XFxcImJvb2ttYXJrLWxpc3RcXFwiIG5nLWlmPVxcXCJCb29rbWFya3MuaXNTdXBwb3J0ZWRcXFwiPjxkaXYgY2xhc3M9XFxcIm1vZGFsLWhlYWRlciBjYXJkIG5vLXRvcC1tYXJnaW4gbm8tcmlnaHQtbWFyZ2luXFxcIj48bW9kYWwtY2xvc2UtYnV0dG9uIG9uLWNsb3NlPVxcXCJsb2dCb29rbWFya3NDbG9zZWQoKVxcXCI+PC9tb2RhbC1jbG9zZS1idXR0b24+PGgyIGNsYXNzPVxcXCJuby1ib3R0b20tbWFyZ2luXFxcIj5Cb29rbWFya3MgKHt7IEJvb2ttYXJrcy5sZW5ndGggfX0pPC9oMj48YSBuZy1jbGljaz1cXFwiQm9va21hcmtzLmNsZWFyKClcXFwiPjxpIGNsYXNzPVxcXCJmYSBmYS10cmFzaC1vXFxcIj48L2k+IENsZWFyIGFsbDwvYT48L2Rpdj48ZGl2IGNsYXNzPVxcXCJmbGV4LWdyb3ctMSBzY3JvbGwteVxcXCI+PGRpdiBuZy1pZj1cXFwiQm9va21hcmtzLmxlbmd0aCA+IDBcXFwiIGNsYXNzPVxcXCJoZmxleCBmbGV4LXdyYXBcXFwiPjx2bC1wbG90LWdyb3VwIG5nLXJlcGVhdD1cXFwiY2hhcnQgaW4gQm9va21hcmtzLmRpY3QgfCBvcmRlck9iamVjdEJ5IDogXFwndGltZUFkZGVkXFwnIDogZmFsc2VcXFwiIGNsYXNzPVxcXCJ3cmFwcGVkLXZsLXBsb3QtZ3JvdXAgY2FyZFxcXCIgY2hhcnQ9XFxcImNoYXJ0XFxcIiBmaWVsZC1zZXQ9XFxcImNoYXJ0LmZpZWxkU2V0XFxcIiBzaG93LWJvb2ttYXJrPVxcXCJ0cnVlXFxcIiBzaG93LWRlYnVnPVxcXCJjb25zdHMuZGVidWdcXFwiIHNob3ctZXhwYW5kPVxcXCJmYWxzZVxcXCIgYWx3YXlzLXNlbGVjdGVkPVxcXCJ0cnVlXFxcIiBoaWdobGlnaHRlZD1cXFwiaGlnaGxpZ2h0ZWRcXFwiIG5nLW1vdXNlb3Zlcj1cXFwiKGhpZ2hsaWdodGVkfHx7fSlbZmllbGQubmFtZV0gPSB0cnVlXFxcIiBuZy1tb3VzZW91dD1cXFwiKGhpZ2hsaWdodGVkfHx7fSlbZmllbGQubmFtZV0gPSBmYWxzZVxcXCIgb3ZlcmZsb3c9XFxcInRydWVcXFwiIHRvb2x0aXA9XFxcInRydWVcXFwiIHByaW9yaXR5PVxcXCJjb25zdHMucHJpb3JpdHkuYm9va21hcmtcXFwiPjwvdmwtcGxvdC1ncm91cD48L2Rpdj48ZGl2IGNsYXNzPVxcXCJ2aXMtbGlzdC1lbXB0eVxcXCIgbmctaWY9XFxcIkJvb2ttYXJrcy5sZW5ndGggPT09IDBcXFwiPllvdSBoYXZlIG5vIGJvb2ttYXJrczwvZGl2PjwvZGl2PjwvbW9kYWw+XCIpO1xuJHRlbXBsYXRlQ2FjaGUucHV0KFwiZGF0YXNldC9hZGRteXJpYWRhdGFzZXQuaHRtbFwiLFwiPGRpdiBjbGFzcz1cXFwiYWRkLW15cmlhLWRhdGFzZXRcXFwiPjxwPlNlbGVjdCBhIGRhdGFzZXQgZnJvbSB0aGUgTXlyaWEgaW5zdGFuY2UgYXQgPGNvZGU+e3tteXJpYVJlc3RVcmx9fTwvY29kZT4uPC9wPjxmb3JtIG5nLXN1Ym1pdD1cXFwiYWRkRGF0YXNldChteXJpYURhdGFzZXQpXFxcIj48ZGl2PjxzZWxlY3QgbmFtZT1cXFwibXlyaWEtZGF0YXNldFxcXCIgaWQ9XFxcInNlbGVjdC1teXJpYS1kYXRhc2V0XFxcIiBuZy1kaXNhYmxlZD1cXFwiZGlzYWJsZWRcXFwiIG5nLW1vZGVsPVxcXCJteXJpYURhdGFzZXRcXFwiIG5nLW9wdGlvbnM9XFxcIm9wdGlvbk5hbWUoZGF0YXNldCkgZm9yIGRhdGFzZXQgaW4gbXlyaWFEYXRhc2V0cyB0cmFjayBieSBkYXRhc2V0LnJlbGF0aW9uTmFtZVxcXCI+PG9wdGlvbiB2YWx1ZT1cXFwiXFxcIj5TZWxlY3QgRGF0YXNldC4uLjwvb3B0aW9uPjwvc2VsZWN0PjwvZGl2PjxidXR0b24gdHlwZT1cXFwic3VibWl0XFxcIj5BZGQgZGF0YXNldDwvYnV0dG9uPjwvZm9ybT48L2Rpdj5cIik7XG4kdGVtcGxhdGVDYWNoZS5wdXQoXCJkYXRhc2V0L2FkZHVybGRhdGFzZXQuaHRtbFwiLFwiPGRpdiBjbGFzcz1cXFwiYWRkLXVybC1kYXRhc2V0XFxcIj48cD5BZGQgdGhlIG5hbWUgb2YgdGhlIGRhdGFzZXQgYW5kIHRoZSBVUkwgdG8gYSA8Yj5KU09OPC9iPiBvciA8Yj5DU1Y8L2I+ICh3aXRoIGhlYWRlcikgZmlsZS4gTWFrZSBzdXJlIHRoYXQgdGhlIGZvcm1hdHRpbmcgaXMgY29ycmVjdCBhbmQgY2xlYW4gdGhlIGRhdGEgYmVmb3JlIGFkZGluZyBpdCB0byBWb3lhZ2VyLiBUaGUgYWRkZWQgZGF0YXNldCBpcyBvbmx5IHZpc2libGUgdG8geW91LjwvcD48Zm9ybSBuZy1zdWJtaXQ9XFxcImFkZEZyb21VcmwoYWRkZWREYXRhc2V0KVxcXCI+PGRpdiBjbGFzcz1cXFwiZm9ybS1ncm91cFxcXCI+PGxhYmVsIGZvcj1cXFwiZGF0YXNldC1uYW1lXFxcIj5OYW1lPC9sYWJlbD4gPGlucHV0IG5nLW1vZGVsPVxcXCJhZGRlZERhdGFzZXQubmFtZVxcXCIgaWQ9XFxcImRhdGFzZXQtbmFtZVxcXCIgdHlwZT1cXFwidGV4dFxcXCI+PC9kaXY+PGRpdiBjbGFzcz1cXFwiZm9ybS1ncm91cFxcXCI+PGxhYmVsIGZvcj1cXFwiZGF0YXNldC11cmxcXFwiPlVSTDwvbGFiZWw+IDxpbnB1dCBuZy1tb2RlbD1cXFwiYWRkZWREYXRhc2V0LnVybFxcXCIgaWQ9XFxcImRhdGFzZXQtdXJsXFxcIiB0eXBlPVxcXCJ1cmxcXFwiPjxwPk1ha2Ugc3VyZSB0aGF0IHlvdSBob3N0IHRoZSBmaWxlIG9uIGEgc2VydmVyIHRoYXQgaGFzIDxjb2RlPkFjY2Vzcy1Db250cm9sLUFsbG93LU9yaWdpbjogKjwvY29kZT4gc2V0LjwvcD48L2Rpdj48YnV0dG9uIHR5cGU9XFxcInN1Ym1pdFxcXCI+QWRkIGRhdGFzZXQ8L2J1dHRvbj48L2Zvcm0+PC9kaXY+XCIpO1xuJHRlbXBsYXRlQ2FjaGUucHV0KFwiZGF0YXNldC9jaGFuZ2Vsb2FkZWRkYXRhc2V0Lmh0bWxcIixcIjxkaXYgY2xhc3M9XFxcImNoYW5nZS1sb2FkZWQtZGF0YXNldFxcXCI+PGRpdiBuZy1pZj1cXFwidXNlckRhdGEubGVuZ3RoXFxcIj48aDM+VXBsb2FkZWQgRGF0YXNldHM8L2gzPjx1bD48bGkgbmctcmVwZWF0PVxcXCJkYXRhc2V0IGluIHVzZXJEYXRhIHRyYWNrIGJ5IGRhdGFzZXQuaWRcXFwiIG5nLWNsYXNzPVxcXCJ7c2VsZWN0ZWQ6IERhdGFzZXQuY3VycmVudERhdGFzZXQuaWQgPT09IGRhdGFzZXQuaWR9XFxcIj48YSBjbGFzcz1cXFwiZGF0YXNldFxcXCIgbmctY2xpY2s9XFxcInNlbGVjdERhdGFzZXQoZGF0YXNldClcXFwiIG5nLWRpc2FibGVkPVxcXCJEYXRhc2V0LmN1cnJlbnREYXRhc2V0LmlkID09PSBkYXRhc2V0LmlkXFxcIj48aSBjbGFzcz1cXFwiZmEgZmEtZGF0YWJhc2VcXFwiPjwvaT4gPHN0cm9uZz57e2RhdGFzZXQubmFtZX19PC9zdHJvbmc+PC9hPiA8c3BhbiBuZy1pZj1cXFwiZGF0YXNldC5kZXNjcmlwdGlvblxcXCI+e3tkYXRhc2V0LmRlc2NyaXB0aW9ufX08L3NwYW4+IDxzdHJvbmcgbmctaWY9XFxcIkRhdGFzZXQuY3VycmVudERhdGFzZXQgPT09IGRhdGFzZXRcXFwiPihzZWxlY3RlZCk8L3N0cm9uZz48L2xpPjwvdWw+PC9kaXY+PGgzPkV4cGxvcmUgYSBTYW1wbGUgRGF0YXNldDwvaDM+PHVsIGNsYXNzPVxcXCJsb2FkZWQtZGF0YXNldC1saXN0XFxcIj48bGkgbmctcmVwZWF0PVxcXCJkYXRhc2V0IGluIHNhbXBsZURhdGEgdHJhY2sgYnkgZGF0YXNldC5pZFxcXCIgbmctY2xhc3M9XFxcIntzZWxlY3RlZDogRGF0YXNldC5jdXJyZW50RGF0YXNldC5pZCA9PT0gZGF0YXNldC5pZH1cXFwiPjxhIGNsYXNzPVxcXCJkYXRhc2V0XFxcIiBuZy1jbGljaz1cXFwic2VsZWN0RGF0YXNldChkYXRhc2V0KVxcXCIgbmctZGlzYWJsZWQ9XFxcIkRhdGFzZXQuY3VycmVudERhdGFzZXQuaWQgPT09IGRhdGFzZXQuaWRcXFwiPjxpIGNsYXNzPVxcXCJmYSBmYS1kYXRhYmFzZVxcXCI+PC9pPiA8c3Ryb25nPnt7ZGF0YXNldC5uYW1lfX08L3N0cm9uZz48L2E+IDxzdHJvbmcgbmctaWY9XFxcIkRhdGFzZXQuY3VycmVudERhdGFzZXQgPT09IGRhdGFzZXRcXFwiPihzZWxlY3RlZCk8L3N0cm9uZz4gPGVtIG5nLWlmPVxcXCJkYXRhc2V0LmRlc2NyaXB0aW9uXFxcIj57e2RhdGFzZXQuZGVzY3JpcHRpb259fTwvZW0+PC9saT48L3VsPjwvZGl2PlwiKTtcbiR0ZW1wbGF0ZUNhY2hlLnB1dChcImRhdGFzZXQvZGF0YXNldG1vZGFsLmh0bWxcIixcIjxtb2RhbCBpZD1cXFwiZGF0YXNldC1tb2RhbFxcXCIgbWF4LXdpZHRoPVxcXCI4MDBweFxcXCI+PGRpdiBjbGFzcz1cXFwibW9kYWwtaGVhZGVyXFxcIj48bW9kYWwtY2xvc2UtYnV0dG9uPjwvbW9kYWwtY2xvc2UtYnV0dG9uPjxoMj5BZGQgRGF0YXNldDwvaDI+PC9kaXY+PHRhYnNldD48dGFiIGhlYWRpbmc9XFxcIkNoYW5nZSBEYXRhc2V0XFxcIj48Y2hhbmdlLWxvYWRlZC1kYXRhc2V0PjwvY2hhbmdlLWxvYWRlZC1kYXRhc2V0PjwvdGFiPjx0YWIgaGVhZGluZz1cXFwiUGFzdGUgb3IgVXBsb2FkIERhdGFcXFwiPjxwYXN0ZS1kYXRhc2V0PjwvcGFzdGUtZGF0YXNldD48L3RhYj48dGFiIGhlYWRpbmc9XFxcIkZyb20gVVJMXFxcIj48YWRkLXVybC1kYXRhc2V0PjwvYWRkLXVybC1kYXRhc2V0PjwvdGFiPjx0YWIgaGVhZGluZz1cXFwiRnJvbSBNeXJpYVxcXCI+PGFkZC1teXJpYS1kYXRhc2V0PjwvYWRkLW15cmlhLWRhdGFzZXQ+PC90YWI+PC90YWJzZXQ+PC9tb2RhbD5cIik7XG4kdGVtcGxhdGVDYWNoZS5wdXQoXCJkYXRhc2V0L2RhdGFzZXRzZWxlY3Rvci5odG1sXCIsXCI8YnV0dG9uIGlkPVxcXCJzZWxlY3QtZGF0YVxcXCIgY2xhc3M9XFxcInNtYWxsLWJ1dHRvbiBzZWxlY3QtZGF0YVxcXCIgbmctY2xpY2s9XFxcImxvYWREYXRhc2V0KCk7XFxcIj5DaGFuZ2U8L2J1dHRvbj5cIik7XG4kdGVtcGxhdGVDYWNoZS5wdXQoXCJkYXRhc2V0L2ZpbGVkcm9wem9uZS5odG1sXCIsXCI8ZGl2IGNsYXNzPVxcXCJkcm9wem9uZVxcXCIgbmctdHJhbnNjbHVkZT1cXFwiXFxcIj48L2Rpdj5cIik7XG4kdGVtcGxhdGVDYWNoZS5wdXQoXCJkYXRhc2V0L3Bhc3RlZGF0YXNldC5odG1sXCIsXCI8ZGl2IGNsYXNzPVxcXCJwYXN0ZS1kYXRhXFxcIj48ZmlsZS1kcm9wem9uZSBkYXRhc2V0PVxcXCJkYXRhc2V0XFxcIiBtYXgtZmlsZS1zaXplPVxcXCIxMFxcXCIgdmFsaWQtbWltZS10eXBlcz1cXFwiW3RleHQvY3N2LCB0ZXh0L2pzb24sIHRleHQvdHN2XVxcXCI+PGRpdiBjbGFzcz1cXFwidXBsb2FkLWRhdGFcXFwiPjxkaXYgY2xhc3M9XFxcImZvcm0tZ3JvdXBcXFwiPjxsYWJlbCBmb3I9XFxcImRhdGFzZXQtZmlsZVxcXCI+RmlsZTwvbGFiZWw+IDxpbnB1dCB0eXBlPVxcXCJmaWxlXFxcIiBpZD1cXFwiZGF0YXNldC1maWxlXFxcIiBhY2NlcHQ9XFxcInRleHQvY3N2LHRleHQvdHN2XFxcIj48L2Rpdj48cD5VcGxvYWQgYSBDU1YsIG9yIHBhc3RlIGRhdGEgaW4gPGEgaHJlZj1cXFwiaHR0cHM6Ly9lbi53aWtpcGVkaWEub3JnL3dpa2kvQ29tbWEtc2VwYXJhdGVkX3ZhbHVlc1xcXCI+Q1NWPC9hPiBmb3JtYXQgaW50byB0aGUgZmllbGRzLjwvcD48ZGl2IGNsYXNzPVxcXCJkcm9wem9uZS10YXJnZXRcXFwiPjxwPkRyb3AgQ1NWIGZpbGUgaGVyZTwvcD48L2Rpdj48L2Rpdj48Zm9ybSBuZy1zdWJtaXQ9XFxcImFkZERhdGFzZXQoKVxcXCI+PGRpdiBjbGFzcz1cXFwiZm9ybS1ncm91cFxcXCI+PGxhYmVsIGZvcj1cXFwiZGF0YXNldC1uYW1lXFxcIj5OYW1lPC9sYWJlbD4gPGlucHV0IHR5cGU9XFxcIm5hbWVcXFwiIG5nLW1vZGVsPVxcXCJkYXRhc2V0Lm5hbWVcXFwiIGlkPVxcXCJkYXRhc2V0LW5hbWVcXFwiIHJlcXVpcmVkPVxcXCJcXFwiPjwvZGl2PjxkaXYgY2xhc3M9XFxcImZvcm0tZ3JvdXBcXFwiPjx0ZXh0YXJlYSBuZy1tb2RlbD1cXFwiZGF0YXNldC5kYXRhXFxcIiBuZy1tb2RlbC1vcHRpb25zPVxcXCJ7IHVwZGF0ZU9uOiBcXCdkZWZhdWx0IGJsdXJcXCcsIGRlYm91bmNlOiB7IFxcJ2RlZmF1bHRcXCc6IDE3LCBcXCdibHVyXFwnOiAwIH19XFxcIiByZXF1aXJlZD1cXFwiXFxcIj5cXG4gICAgICA8L3RleHRhcmVhPjwvZGl2PjxidXR0b24gdHlwZT1cXFwic3VibWl0XFxcIj5BZGQgZGF0YTwvYnV0dG9uPjwvZm9ybT48L2ZpbGUtZHJvcHpvbmU+PC9kaXY+XCIpO1xuJHRlbXBsYXRlQ2FjaGUucHV0KFwiZmllbGRpbmZvL2ZpZWxkaW5mby5odG1sXCIsXCI8c3BhbiBjbGFzcz1cXFwiZmllbGQtaW5mb1xcXCI+PHNwYW4gY2xhc3M9XFxcImhmbGV4IGZ1bGwtd2lkdGhcXFwiIG5nLWNsaWNrPVxcXCJjbGlja2VkKCRldmVudClcXFwiPjxzcGFuIGNsYXNzPVxcXCJ0eXBlLWNhcmV0XFxcIiBuZy1jbGFzcz1cXFwie2FjdGl2ZTogIWRpc2FibGVDb3VudENhcmV0IHx8IGZpZWxkLmFnZ3JlZ2F0ZSE9PVxcJ2NvdW50XFwnfVxcXCI+PGkgY2xhc3M9XFxcImZhIGZhLWNhcmV0LWRvd25cXFwiIG5nLXNob3c9XFxcInNob3dDYXJldFxcXCI+PC9pPiA8c3BhbiBjbGFzcz1cXFwidHlwZSBmYSB7e2ljb259fVxcXCIgbmctc2hvdz1cXFwic2hvd1R5cGVcXFwiIHRpdGxlPVxcXCJ7e3R5cGVOYW1lc1tmaWVsZC50eXBlXX19XFxcIj48L3NwYW4+PC9zcGFuPiA8c3BhbiBuZy1pZj1cXFwiZmllbGQuYWdncmVnYXRlIT09XFwnY291bnRcXCdcXFwiIGNsYXNzPVxcXCJmaWVsZC1pbmZvLXRleHRcXFwiPjxzcGFuIG5nLWlmPVxcXCJmdW5jKGZpZWxkKVxcXCIgY2xhc3M9XFxcImZpZWxkLWZ1bmNcXFwiIG5nLWNsYXNzPVxcXCJ7YW55OiBmaWVsZC5fYW55fVxcXCI+e3sgZnVuYyhmaWVsZCkgfX08L3NwYW4+PHNwYW4gY2xhc3M9XFxcImZpZWxkLW5hbWVcXFwiIG5nLWNsYXNzPVxcXCJ7aGFzZnVuYzogZnVuYyhmaWVsZCksIGFueTogZmllbGQuX2FueX1cXFwiPnt7IGZpZWxkLm5hbWUgfCB1bmRlcnNjb3JlMnNwYWNlIH19PC9zcGFuPjwvc3Bhbj4gPHNwYW4gbmctaWY9XFxcImZpZWxkLmFnZ3JlZ2F0ZT09PVxcJ2NvdW50XFwnXFxcIiBjbGFzcz1cXFwiZmllbGQtY291bnQgZmllbGQtaW5mby10ZXh0XFxcIj48c3BhbiBjbGFzcz1cXFwiZmllbGQtbmFtZVxcXCI+Q09VTlQ8L3NwYW4+PC9zcGFuPiA8c3BhbiBjbGFzcz1cXFwibm8tc2hyaW5rIHJlbW92ZVxcXCIgbmctc2hvdz1cXFwic2hvd1JlbW92ZVxcXCI+PGEgY2xhc3M9XFxcInJlbW92ZS1maWVsZFxcXCIgbmctY2xpY2s9XFxcInJlbW92ZUFjdGlvbigpXFxcIj48aSBjbGFzcz1cXFwiZmEgZmEtdGltZXNcXFwiPjwvaT48L2E+PC9zcGFuPiA8c3BhbiBjbGFzcz1cXFwibm8tc2hyaW5rIGluZm9cXFwiIG5nLXNob3c9XFxcInNob3dJbmZvXFxcIj48aSBuZy1pZj1cXFwiZmllbGQuYWdncmVnYXRlICE9PSBcXCdjb3VudFxcJyAmJiBpc1R5cGVzKGZpZWxkLCBbXFwnTlxcJywgXFwnT1xcJ10pXFxcIiBjbGFzcz1cXFwiZmEgZmEtaW5mby1jaXJjbGVcXFwiIHRvb2x0aXBzPVxcXCJcXFwiIHRvb2x0aXAtc2l6ZT1cXFwic21hbGxcXFwiIHRvb2x0aXAtaHRtbD1cXFwiPGRpdiBjbGFzcz1cXCd0b29sdGlwLWNvbnRlbnRcXCc+IDxzdHJvbmc+TmFtZTo8L3N0cm9uZz4ge3tmaWVsZC5uYW1lfX08YnI+IDxzdHJvbmc+Q2FyZGluYWxpdHk6PC9zdHJvbmc+IHt7c3RhdHMuZGlzdGluY3QgfCBudW1iZXJ9fTxicj4gPHN0cm9uZz5NaW46PC9zdHJvbmc+IHt7c3RhdHMubWlufX08YnI+IDxzdHJvbmc+TWF4Ojwvc3Ryb25nPiB7e3N0YXRzLm1heH19PGJyPiA8c3Ryb25nPlNhbXBsZTo8L3N0cm9uZz4gPHNwYW4gY2xhc3M9XFwnc2FtcGxlXFwnPnt7c3RhdHMuc2FtcGxlLmpvaW4oXFwnLCBcXCcpfX08L3NwYW4+IDwvZGl2PlxcXCIgdG9vbHRpcC1zaWRlPVxcXCJyaWdodFxcXCI+PC9pPiA8aSBuZy1pZj1cXFwiZmllbGQuYWdncmVnYXRlICE9PSBcXCdjb3VudFxcJyAmJiBmaWVsZC50eXBlID09PSBcXCdUXFwnXFxcIiBjbGFzcz1cXFwiZmEgZmEtaW5mby1jaXJjbGVcXFwiIHRvb2x0aXBzPVxcXCJcXFwiIHRvb2x0aXAtc2l6ZT1cXFwic21hbGxcXFwiIHRvb2x0aXAtaHRtbD1cXFwiPGRpdiBjbGFzcz1cXCd0b29sdGlwLWNvbnRlbnRcXCc+IDxzdHJvbmc+TmFtZTo8L3N0cm9uZz4ge3tmaWVsZC5uYW1lfX08YnI+IDxzdHJvbmc+Q2FyZGluYWxpdHk6PC9zdHJvbmc+IHt7c3RhdHMuZGlzdGluY3QgfCBudW1iZXJ9fTxicj4gPHN0cm9uZz5NaW46PC9zdHJvbmc+IHt7c3RhdHMubWluIHwgZGF0ZTogc2hvcnR9fTxicj4gPHN0cm9uZz5NYXg6PC9zdHJvbmc+IHt7c3RhdHMubWF4IHwgZGF0ZTogc2hvcnR9fTxicj4gPHN0cm9uZz5TYW1wbGU6PC9zdHJvbmc+IDxzcGFuIGNsYXNzPVxcJ3NhbXBsZVxcJz57e3N0YXRzLnNhbXBsZS5qb2luKFxcJywgXFwnKX19PC9zcGFuPiA8L2Rpdj5cXFwiIHRvb2x0aXAtc2lkZT1cXFwicmlnaHRcXFwiPjwvaT4gPGkgbmctaWY9XFxcImZpZWxkLmFnZ3JlZ2F0ZSAhPT0gXFwnY291bnRcXCcgJiYgZmllbGQudHlwZSA9PT0gXFwnUVxcJ1xcXCIgY2xhc3M9XFxcImZhIGZhLWluZm8tY2lyY2xlXFxcIiB0b29sdGlwcz1cXFwiXFxcIiB0b29sdGlwLXNpemU9XFxcInNtYWxsXFxcIiB0b29sdGlwLWh0bWw9XFxcIjxkaXYgY2xhc3M9XFwndG9vbHRpcC1jb250ZW50XFwnPiA8c3Ryb25nPk5hbWU6PC9zdHJvbmc+IHt7ZmllbGQubmFtZX19PGJyPiA8c3Ryb25nPkNhcmRpbmFsaXR5Ojwvc3Ryb25nPiB7e3N0YXRzLmRpc3RpbmN0IHwgbnVtYmVyfX08YnI+IDxzdHJvbmc+TWluOjwvc3Ryb25nPiB7e3N0YXRzLm1pbiB8IG51bWJlcn19PGJyPiA8c3Ryb25nPk1heDo8L3N0cm9uZz4ge3tzdGF0cy5tYXggfCBudW1iZXJ9fTxicj4gPHN0cm9uZz5TdGRldjo8L3N0cm9uZz4ge3tzdGF0cy5zdGRldiB8IG51bWJlcjoyfX08YnI+IDxzdHJvbmc+TWVhbjo8L3N0cm9uZz4ge3tzdGF0cy5tZWFuIHwgbnVtYmVyOjJ9fTxicj4gPHN0cm9uZz5NZWRpYW46PC9zdHJvbmc+IHt7c3RhdHMubWVkaWFuIHwgbnVtYmVyfX08YnI+IDxzdHJvbmc+U2FtcGxlOjwvc3Ryb25nPiA8c3BhbiBjbGFzcz1cXCdzYW1wbGVcXCc+e3tzdGF0cy5zYW1wbGUuam9pbihcXCcsIFxcJyl9fTwvc3Bhbj4gPC9kaXY+XFxcIiB0b29sdGlwLXNpZGU9XFxcInJpZ2h0XFxcIj48L2k+PGkgbmctaWY9XFxcImZpZWxkLmFnZ3JlZ2F0ZSA9PT0gXFwnY291bnRcXCdcXFwiIGNsYXNzPVxcXCJmYSBmYS1pbmZvLWNpcmNsZVxcXCIgdG9vbHRpcHM9XFxcIlxcXCIgdG9vbHRpcC1zaXplPVxcXCJzbWFsbFxcXCIgdG9vbHRpcC1odG1sPVxcXCI8ZGl2IGNsYXNzPVxcJ3Rvb2x0aXAtY29udGVudFxcJz4gPHN0cm9uZz5Db3VudDo8L3N0cm9uZz4ge3tzdGF0cy5tYXh9fSA8L2Rpdj5cXFwiIHRvb2x0aXAtc2lkZT1cXFwicmlnaHRcXFwiPjwvaT48L3NwYW4+PC9zcGFuPjwvc3Bhbj5cIik7XG4kdGVtcGxhdGVDYWNoZS5wdXQoXCJtb2RhbC9tb2RhbC5odG1sXCIsXCI8ZGl2IGNsYXNzPVxcXCJtb2RhbFxcXCIgbmctaWY9XFxcImlzT3BlblxcXCI+PGRpdiBjbGFzcz1cXFwibW9kYWwtd3JhcHBlclxcXCIgc3R5bGU9XFxcInt7d3JhcHBlclN0eWxlfX1cXFwiIG5nLXRyYW5zY2x1ZGU9XFxcIlxcXCI+PC9kaXY+PC9kaXY+XCIpO1xuJHRlbXBsYXRlQ2FjaGUucHV0KFwibW9kYWwvbW9kYWxjbG9zZWJ1dHRvbi5odG1sXCIsXCI8ZGl2IGNsYXNzPVxcXCJyaWdodFxcXCI+PGEgbmctY2xpY2s9XFxcImNsb3NlTW9kYWwoKVxcXCIgY2xhc3M9XFxcInJpZ2h0XFxcIj5DbG9zZTwvYT48L2Rpdj5cIik7XG4kdGVtcGxhdGVDYWNoZS5wdXQoXCJ0YWJzL3RhYi5odG1sXCIsXCI8ZGl2IG5nLWlmPVxcXCJhY3RpdmVcXFwiIG5nLXRyYW5zY2x1ZGU9XFxcIlxcXCI+PC9kaXY+XCIpO1xuJHRlbXBsYXRlQ2FjaGUucHV0KFwidGFicy90YWJzZXQuaHRtbFwiLFwiPGRpdiBjbGFzcz1cXFwidGFiLWNvbnRhaW5lclxcXCI+PGRpdj48YSBjbGFzcz1cXFwidGFiXFxcIiBuZy1yZXBlYXQ9XFxcInRhYiBpbiB0YWJzZXQudGFic1xcXCIgbmctY2xhc3M9XFxcIntcXCdhY3RpdmVcXCc6IHRhYi5hY3RpdmV9XFxcIiBuZy1jbGljaz1cXFwidGFic2V0LnNob3dUYWIodGFiKVxcXCI+e3t0YWIuaGVhZGluZ319PC9hPjwvZGl2PjxkaXYgY2xhc3M9XFxcInRhYi1jb250ZW50c1xcXCIgbmctdHJhbnNjbHVkZT1cXFwiXFxcIj48L2Rpdj48L2Rpdj5cIik7XG4kdGVtcGxhdGVDYWNoZS5wdXQoXCJ2bHBsb3QvdmxwbG90Lmh0bWxcIixcIjxkaXYgY2xhc3M9XFxcInZpc1xcXCIgaWQ9XFxcInZpcy17e3Zpc0lkfX1cXFwiIG5nLWNsYXNzPVxcXCJ7IGZpdDogIWFsd2F5c1Njcm9sbGFibGUgJiYgIW92ZXJmbG93ICYmIChtYXhIZWlnaHQgJiYgKCFoZWlnaHQgfHwgaGVpZ2h0IDw9IG1heEhlaWdodCkpICYmIChtYXhXaWR0aCAmJiAoIXdpZHRoIHx8IHdpZHRoIDw9IG1heFdpZHRoKSksIG92ZXJmbG93OiBhbHdheXNTY3JvbGxhYmxlIHx8IG92ZXJmbG93IHx8IChtYXhIZWlnaHQgJiYgaGVpZ2h0ICYmIGhlaWdodCA+IG1heEhlaWdodCkgfHwgKG1heFdpZHRoICYmIHdpZHRoICYmIHdpZHRoID4gbWF4V2lkdGgpLCBzY3JvbGw6IGFsd2F5c1Njcm9sbGFibGUgfHwgdW5sb2NrZWQgfHwgaG92ZXJGb2N1cyB9XFxcIiBuZy1tb3VzZWRvd249XFxcInVubG9ja2VkPSF0aHVtYm5haWxcXFwiIG5nLW1vdXNldXA9XFxcInVubG9ja2VkPWZhbHNlXFxcIiBuZy1tb3VzZW92ZXI9XFxcIm1vdXNlb3ZlcigpXFxcIiBuZy1tb3VzZW91dD1cXFwibW91c2VvdXQoKVxcXCI+PGRpdiBjbGFzcz1cXFwidmlzLXRvb2x0aXBcXFwiIG5nLXNob3c9XFxcInRvb2x0aXBBY3RpdmVcXFwiPjx0YWJsZT48dHIgbmctcmVwZWF0PVxcXCJwIGluIGRhdGFcXFwiPjx0ZCBjbGFzcz1cXFwia2V5XFxcIj57e3BbMF19fTwvdGQ+PHRkIGNsYXNzPVxcXCJ2YWx1ZVxcXCI+PGI+e3twWzFdfX08L2I+PC90ZD48L3RyPjwvdGFibGU+PC9kaXY+PC9kaXY+XCIpO1xuJHRlbXBsYXRlQ2FjaGUucHV0KFwidmxwbG90Z3JvdXAvdmxwbG90Z3JvdXAuaHRtbFwiLFwiPGRpdiBjbGFzcz1cXFwidmwtcGxvdC1ncm91cCB2ZmxleFxcXCI+PGRpdiBuZy1zaG93PVxcXCJzaG93RXhwYW5kIHx8IGZpZWxkU2V0IHx8IHNob3dUcmFuc3Bvc2UgfHwgc2hvd0Jvb2ttYXJrICYmIEJvb2ttYXJrcy5pc1N1cHBvcnRlZCB8fCBzaG93VG9nZ2xlXFxcIiBjbGFzcz1cXFwidmwtcGxvdC1ncm91cC1oZWFkZXIgZnVsbC13aWR0aCBuby1zaHJpbmtcXFwiPjxkaXYgY2xhc3M9XFxcImZpZWxkLXNldC1pbmZvXFxcIj48ZmllbGQtaW5mbyBuZy1yZXBlYXQ9XFxcImZpZWxkIGluIGZpZWxkU2V0XFxcIiBuZy1pZj1cXFwiZmllbGRTZXRcXFwiIGZpZWxkPVxcXCJmaWVsZFxcXCIgc2hvdy10eXBlPVxcXCJ0cnVlXFxcIiBuZy1jbGFzcz1cXFwieyBzZWxlY3RlZDogYWx3YXlzU2VsZWN0ZWQgfHwgKGlzU2VsZWN0ZWQgJiYgaXNTZWxlY3RlZChmaWVsZC5uYW1lKSksIHVuc2VsZWN0ZWQ6IGlzU2VsZWN0ZWQgJiYgIWlzU2VsZWN0ZWQoZmllbGQubmFtZSksIGhpZ2hsaWdodGVkOiAoaGlnaGxpZ2h0ZWR8fHt9KVtmaWVsZC5uYW1lXSB9XFxcIiBuZy1tb3VzZW92ZXI9XFxcIihoaWdobGlnaHRlZHx8e30pW2ZpZWxkLm5hbWVdID0gdHJ1ZVxcXCIgbmctbW91c2VvdXQ9XFxcIihoaWdobGlnaHRlZHx8e30pW2ZpZWxkLm5hbWVdID0gZmFsc2VcXFwiPjwvZmllbGQtaW5mbz48L2Rpdj48ZGl2IGNsYXNzPVxcXCJ0b29sYm94XFxcIj48YSBuZy1pZj1cXFwiY29uc3RzLmRlYnVnICYmIHNob3dEZWJ1Z1xcXCIgY2xhc3M9XFxcImNvbW1hbmQgZGVidWdcXFwiPjxpIGNsYXNzPVxcXCJmYSBmYS13cmVuY2hcXFwiIG5nLWNsaWNrPVxcXCJzaENvcGllZD1cXCdcXCc7IHZsQ29waWVkPVxcJ1xcJzsgdmdDb3BpZWQ9XFwnXFwnO1xcXCIgbmctbW91c2VvdmVyPVxcXCJpbml0aWFsaXplUG9wdXAoKTtcXFwiPjwvaT48L2E+PHZsLXBsb3QtZ3JvdXAtcG9wdXAgbmctaWY9XFxcImNvbnN0cy5kZWJ1ZyAmJiBzaG93RGVidWcgJiYgcmVuZGVyUG9wdXBcXFwiPjwvdmwtcGxvdC1ncm91cC1wb3B1cD48YSBuZy1pZj1cXFwic2hvd01hcmtUeXBlXFxcIiBjbGFzcz1cXFwiY29tbWFuZCBkaXNhYmxlZFxcXCI+PGkgY2xhc3M9XFxcImZhIGZhLWZvbnRcXFwiPjwvaT4gPGkgY2xhc3M9XFxcImZhIGZhLWxpbmUtY2hhcnRcXFwiPjwvaT4gPGkgY2xhc3M9XFxcImZhIGZhLWFyZWEtY2hhcnRcXFwiPjwvaT4gPGkgY2xhc3M9XFxcImZhIGZhLWJhci1jaGFydFxcXCI+PC9pPiA8aSBjbGFzcz1cXFwiZmEgZmEtY2lyY2xlLW9cXFwiPjwvaT48L2E+IDxhIG5nLWlmPVxcXCJzaG93TG9nICYmIGNoYXJ0LnZsU3BlYyAmJiBsb2cuc3VwcG9ydChjaGFydC52bFNwZWMsIFxcJ3hcXCcpXFxcIiBjbGFzcz1cXFwiY29tbWFuZFxcXCIgbmctY2xpY2s9XFxcImxvZy50b2dnbGUoY2hhcnQudmxTcGVjLCBcXCd4XFwnKVxcXCIgbmctY2xhc3M9XFxcInthY3RpdmU6IGxvZy5hY3RpdmUoY2hhcnQudmxTcGVjLCBcXCd4XFwnKX1cXFwiPjxpIGNsYXNzPVxcXCJmYSBmYS1sb25nLWFycm93LXJpZ2h0XFxcIj48L2k+IDxzbWFsbD5Mb2cgWDwvc21hbGw+PC9hPiA8YSBuZy1pZj1cXFwic2hvd0xvZyAmJiBjaGFydC52bFNwZWMgJiYgbG9nLnN1cHBvcnQoY2hhcnQudmxTcGVjLCBcXCd5XFwnKVxcXCIgY2xhc3M9XFxcImNvbW1hbmRcXFwiIG5nLWNsaWNrPVxcXCJsb2cudG9nZ2xlKGNoYXJ0LnZsU3BlYywgXFwneVxcJylcXFwiIG5nLWNsYXNzPVxcXCJ7YWN0aXZlOiBsb2cuYWN0aXZlKGNoYXJ0LnZsU3BlYywgXFwneVxcJyl9XFxcIj48aSBjbGFzcz1cXFwiZmEgZmEtbG9uZy1hcnJvdy11cFxcXCI+PC9pPiA8c21hbGw+TG9nIFk8L3NtYWxsPjwvYT4gPGEgbmctaWY9XFxcInNob3dTb3J0ICYmIGNoYXJ0LnZsU3BlYyAmJiB0b2dnbGVTb3J0LnN1cHBvcnQoY2hhcnQudmxTcGVjLCBEYXRhc2V0LnN0YXRzKVxcXCIgY2xhc3M9XFxcImNvbW1hbmRcXFwiIG5nLWNsaWNrPVxcXCJ0b2dnbGVTb3J0LnRvZ2dsZShjaGFydC52bFNwZWMpXFxcIj48aSBjbGFzcz1cXFwiZmEgc29ydFxcXCIgbmctY2xhc3M9XFxcInRvZ2dsZVNvcnRDbGFzcyhjaGFydC52bFNwZWMpXFxcIj48L2k+IDxzbWFsbCBuZy1pZj1cXFwic2hvd0xhYmVsXFxcIj5Tb3J0PC9zbWFsbD48L2E+IDxhIG5nLWlmPVxcXCJzaG93RmlsdGVyTnVsbCAmJiBjaGFydC52bFNwZWMgJiYgdG9nZ2xlRmlsdGVyTnVsbC5zdXBwb3J0KGNoYXJ0LnZsU3BlYywgRGF0YXNldC5zdGF0cylcXFwiIGNsYXNzPVxcXCJjb21tYW5kXFxcIiBuZy1jbGljaz1cXFwidG9nZ2xlRmlsdGVyTnVsbChjaGFydC52bFNwZWMpXFxcIiBuZy1jbGFzcz1cXFwie2FjdGl2ZTogY2hhcnQudmxTcGVjICYmIGNoYXJ0LnZsU3BlYy5jZmcuZmlsdGVyTnVsbC5PfVxcXCI+PGkgY2xhc3M9XFxcImZhIGZhLWZpbHRlclxcXCI+PC9pPiA8c21hbGwgbmctaWY9XFxcInNob3dMYWJlbFxcXCI+RmlsdGVyPC9zbWFsbD4gPHNtYWxsPk5VTEw8L3NtYWxsPjwvYT4gPGEgbmctaWY9XFxcInNob3dUcmFuc3Bvc2VcXFwiIGNsYXNzPVxcXCJjb21tYW5kXFxcIiBuZy1jbGljaz1cXFwidHJhbnNwb3NlKClcXFwiPjxpIGNsYXNzPVxcXCJmYSBmYS1yZWZyZXNoIHRyYW5zcG9zZVxcXCI+PC9pPiA8c21hbGwgbmctaWY9XFxcInNob3dMYWJlbFxcXCI+U3dhcCBYL1k8L3NtYWxsPjwvYT4gPGEgbmctaWY9XFxcInNob3dCb29rbWFyayAmJiBCb29rbWFya3MuaXNTdXBwb3J0ZWRcXFwiIGNsYXNzPVxcXCJjb21tYW5kXFxcIiBuZy1jbGljaz1cXFwiQm9va21hcmtzLnRvZ2dsZShjaGFydClcXFwiIG5nLWNsYXNzPVxcXCJ7ZGlzYWJsZWQ6ICFjaGFydC52bFNwZWMuZW5jb2RpbmcsIGFjdGl2ZTogQm9va21hcmtzLmlzQm9va21hcmtlZChjaGFydC5zaG9ydGhhbmQpfVxcXCI+PGkgY2xhc3M9XFxcImZhIGZhLWJvb2ttYXJrXFxcIj48L2k+IDxzbWFsbCBuZy1pZj1cXFwic2hvd0xhYmVsXFxcIj5Cb29rbWFyazwvc21hbGw+PC9hPiA8YSBuZy1pZj1cXFwic2hvd0V4cGFuZFxcXCIgbmctY2xpY2s9XFxcImV4cGFuZEFjdGlvbigpXFxcIiBjbGFzcz1cXFwiY29tbWFuZFxcXCI+PGkgY2xhc3M9XFxcImZhIGZhLWV4cGFuZFxcXCI+PC9pPjwvYT48L2Rpdj48L2Rpdj48ZGl2IGNsYXNzPVxcXCJ2bC1wbG90LXdyYXBwZXIgZnVsbC13aWR0aCB2aXMte3tmaWVsZFNldC5rZXl9fSBmbGV4LWdyb3ctMVxcXCI+PHZsLXBsb3QgY2hhcnQ9XFxcImNoYXJ0XFxcIiBkaXNhYmxlZD1cXFwiZGlzYWJsZWRcXFwiIGlzLWluLWxpc3Q9XFxcImlzSW5MaXN0XFxcIiBhbHdheXMtc2Nyb2xsYWJsZT1cXFwiYWx3YXlzU2Nyb2xsYWJsZVxcXCIgY29uZmlnLXNldD1cXFwie3tjb25maWdTZXR8fFxcJ3NtYWxsXFwnfX1cXFwiIG1heC1oZWlnaHQ9XFxcIm1heEhlaWdodFxcXCIgbWF4LXdpZHRoPVxcXCJtYXhXaWR0aFxcXCIgb3ZlcmZsb3c9XFxcIm92ZXJmbG93XFxcIiBwcmlvcml0eT1cXFwicHJpb3JpdHlcXFwiIHJlc2NhbGU9XFxcInJlc2NhbGVcXFwiIHRodW1ibmFpbD1cXFwidGh1bWJuYWlsXFxcIiB0b29sdGlwPVxcXCJ0b29sdGlwXFxcIj48L3ZsLXBsb3Q+PC9kaXY+PC9kaXY+XCIpO1xuJHRlbXBsYXRlQ2FjaGUucHV0KFwidmxwbG90Z3JvdXAvdmxwbG90Z3JvdXBwb3B1cC5odG1sXCIsXCI8ZGl2IGNsYXNzPVxcXCJkcm9wLWNvbnRhaW5lclxcXCI+PGRpdiBjbGFzcz1cXFwicG9wdXAtbWVudSBwb3B1cC1jb21tYW5kIG5vLXNocmluayBkZXYtdG9vbFxcXCI+PGRpdiBjbGFzcz1cXFwiY29tbWFuZCBkZWJ1Z1xcXCI+PHNwYW4gY2xhc3M9XFxcImRlYnVnXFxcIj5WbHM8L3NwYW4+IDxhIGNsYXNzPVxcXCJkZWJ1Z1xcXCIgdWktemVyb2NsaXA9XFxcIlxcXCIgemVyb2NsaXAtY29waWVkPVxcXCJzaENvcGllZD1cXCcoQ29waWVkKVxcJ1xcXCIgemVyb2NsaXAtbW9kZWw9XFxcImNoYXJ0LnNob3J0aGFuZFxcXCI+Q29weTwvYT4gLyA8YSBjbGFzcz1cXFwiZGVidWdcXFwiIG5nLWNsaWNrPVxcXCJsb2dDb2RlKFxcJ1ZMIHNob3J0aGFuZFxcJywgY2hhcnQuc2hvcnRoYW5kKTsgc2hDb3BpZWQ9XFwnKExvZ2dlZClcXCc7XFxcIj5Mb2c8L2E+IDxzcGFuPnt7c2hDb3BpZWR9fTwvc3Bhbj48L2Rpdj48ZGl2IGNsYXNzPVxcXCJjb21tYW5kIGRlYnVnXFxcIj48c3BhbiBjbGFzcz1cXFwiZGVidWdcXFwiPlZsPC9zcGFuPiA8YSBjbGFzcz1cXFwiZGVidWdcXFwiIHVpLXplcm9jbGlwPVxcXCJcXFwiIHplcm9jbGlwLWNvcGllZD1cXFwidmxDb3BpZWQ9XFwnKENvcGllZClcXCdcXFwiIHplcm9jbGlwLW1vZGVsPVxcXCJjaGFydC5jbGVhblNwZWMgfCBjb21wYWN0SlNPTlxcXCI+Q29weTwvYT4gLyA8YSBjbGFzcz1cXFwiZGVidWdcXFwiIG5nLWNsaWNrPVxcXCJsb2dDb2RlKFxcJ1ZlZ2EtbGl0ZVxcJywgY2hhcnQuY2xlYW5TcGVjKTsgdmxDb3BpZWQ9XFwnKExvZ2dlZClcXCc7XFxcIj5Mb2c8L2E+IDxzcGFuPnt7dmxDb3BpZWR9fTwvc3Bhbj48L2Rpdj48ZGl2IGNsYXNzPVxcXCJjb21tYW5kIGRlYnVnXFxcIj48c3BhbiBjbGFzcz1cXFwiZGVidWdcXFwiPlZnPC9zcGFuPiA8YSBjbGFzcz1cXFwiZGVidWdcXFwiIHVpLXplcm9jbGlwPVxcXCJcXFwiIHplcm9jbGlwLWNvcGllZD1cXFwidmdDb3BpZWQ9XFwnKENvcGllZClcXCdcXFwiIHplcm9jbGlwLW1vZGVsPVxcXCJjaGFydC52Z1NwZWMgfCBjb21wYWN0SlNPTlxcXCI+Q29weTwvYT4gLyA8YSBjbGFzcz1cXFwiZGVidWdcXFwiIG5nLWNsaWNrPVxcXCJsb2dDb2RlKFxcJ1ZlZ2FcXCcsIGNoYXJ0LnZnU3BlYyk7IHZnQ29waWVkPVxcJyhMb2dnZWQpXFwnO1xcXCI+TG9nPC9hPiA8c3Bhbj57e3ZnQ29waWVkfX08L3NwYW4+PC9kaXY+PGEgY2xhc3M9XFxcImNvbW1hbmQgZGVidWdcXFwiIG5nLWhyZWY9XFxcInt7IHt0eXBlOlxcJ3ZsXFwnLCBlbmNvZGluZzogY2hhcnQuY2xlYW5TcGVjfSB8IHJlcG9ydFVybCB9fVxcXCIgdGFyZ2V0PVxcXCJfYmxhbmtcXFwiPlJlcG9ydCBCYWQgUmVuZGVyPC9hPiA8YSBuZy1jbGljaz1cXFwic2hvd0ZlYXR1cmU9IXNob3dGZWF0dXJlXFxcIiBjbGFzcz1cXFwiY29tbWFuZCBkZWJ1Z1xcXCI+e3tjaGFydC5zY29yZX19PC9hPjxkaXYgbmctcmVwZWF0PVxcXCJmIGluIGNoYXJ0LnNjb3JlRmVhdHVyZXMgdHJhY2sgYnkgZi5yZWFzb25cXFwiPlt7e2Yuc2NvcmV9fV0ge3tmLnJlYXNvbn19PC9kaXY+PC9kaXY+PC9kaXY+XCIpO31dKTsiLCIndXNlIHN0cmljdCc7XG5cbmFuZ3VsYXIubW9kdWxlKCd2bHVpJylcbiAgLmRpcmVjdGl2ZSgnYWxlcnRNZXNzYWdlcycsIGZ1bmN0aW9uKEFsZXJ0cykge1xuICAgIHJldHVybiB7XG4gICAgICB0ZW1wbGF0ZVVybDogJ2FsZXJ0bWVzc2FnZXMvYWxlcnRtZXNzYWdlcy5odG1sJyxcbiAgICAgIHJlc3RyaWN0OiAnRScsXG4gICAgICBzY29wZToge30sXG4gICAgICBsaW5rOiBmdW5jdGlvbihzY29wZSAvKiwgZWxlbWVudCwgYXR0cnMqLykge1xuICAgICAgICBzY29wZS5BbGVydHMgPSBBbGVydHM7XG4gICAgICB9XG4gICAgfTtcbiAgfSk7XG4iLCIndXNlIHN0cmljdCc7XG5cbmFuZ3VsYXIubW9kdWxlKCd2bHVpJylcbiAgLnNlcnZpY2UoJ0FsZXJ0cycsIGZ1bmN0aW9uKCR0aW1lb3V0LCBfKSB7XG4gICAgdmFyIEFsZXJ0cyA9IHt9O1xuXG4gICAgQWxlcnRzLmFsZXJ0cyA9IFtdO1xuXG4gICAgQWxlcnRzLmFkZCA9IGZ1bmN0aW9uKG1zZywgZGlzbWlzcykge1xuICAgICAgdmFyIG1lc3NhZ2UgPSB7bXNnOiBtc2d9O1xuICAgICAgQWxlcnRzLmFsZXJ0cy5wdXNoKG1lc3NhZ2UpO1xuICAgICAgaWYgKGRpc21pc3MpIHtcbiAgICAgICAgJHRpbWVvdXQoZnVuY3Rpb24oKSB7XG4gICAgICAgICAgdmFyIGluZGV4ID0gXy5maW5kSW5kZXgoQWxlcnRzLmFsZXJ0cywgbWVzc2FnZSk7XG4gICAgICAgICAgQWxlcnRzLmNsb3NlQWxlcnQoaW5kZXgpO1xuICAgICAgICB9LCBkaXNtaXNzKTtcbiAgICAgIH1cbiAgICB9O1xuXG4gICAgQWxlcnRzLmNsb3NlQWxlcnQgPSBmdW5jdGlvbihpbmRleCkge1xuICAgICAgQWxlcnRzLmFsZXJ0cy5zcGxpY2UoaW5kZXgsIDEpO1xuICAgIH07XG5cbiAgICByZXR1cm4gQWxlcnRzO1xuICB9KTtcbiIsIid1c2Ugc3RyaWN0JztcblxuLyoqXG4gKiBAbmdkb2Mgc2VydmljZVxuICogQG5hbWUgdmx1aS5Cb29rbWFya3NcbiAqIEBkZXNjcmlwdGlvblxuICogIyBCb29rbWFya3NcbiAqIFNlcnZpY2UgaW4gdGhlIHZsdWkuXG4gKi9cbmFuZ3VsYXIubW9kdWxlKCd2bHVpJylcbiAgLnNlcnZpY2UoJ0Jvb2ttYXJrcycsIGZ1bmN0aW9uKF8sIHZsLCBsb2NhbFN0b3JhZ2VTZXJ2aWNlLCBMb2dnZXIsIERhdGFzZXQpIHtcbiAgICB2YXIgQm9va21hcmtzID0gZnVuY3Rpb24oKSB7XG4gICAgICB0aGlzLmRpY3QgPSB7fTtcbiAgICAgIHRoaXMubGVuZ3RoID0gMDtcbiAgICAgIHRoaXMuaXNTdXBwb3J0ZWQgPSBsb2NhbFN0b3JhZ2VTZXJ2aWNlLmlzU3VwcG9ydGVkO1xuICAgIH07XG5cbiAgICB2YXIgcHJvdG8gPSBCb29rbWFya3MucHJvdG90eXBlO1xuXG4gICAgcHJvdG8udXBkYXRlTGVuZ3RoID0gZnVuY3Rpb24oKSB7XG4gICAgICB0aGlzLmxlbmd0aCA9IE9iamVjdC5rZXlzKHRoaXMuZGljdCkubGVuZ3RoO1xuICAgIH07XG5cbiAgICBwcm90by5zYXZlID0gZnVuY3Rpb24oKSB7XG4gICAgICBsb2NhbFN0b3JhZ2VTZXJ2aWNlLnNldCgnYm9va21hcmtzJywgdGhpcy5kaWN0KTtcbiAgICB9O1xuXG4gICAgcHJvdG8ubG9hZCA9IGZ1bmN0aW9uKCkge1xuICAgICAgdGhpcy5kaWN0ID0gbG9jYWxTdG9yYWdlU2VydmljZS5nZXQoJ2Jvb2ttYXJrcycpIHx8IHt9O1xuICAgICAgdGhpcy51cGRhdGVMZW5ndGgoKTtcbiAgICB9O1xuXG4gICAgcHJvdG8uY2xlYXIgPSBmdW5jdGlvbigpIHtcbiAgICAgIHRoaXMuZGljdCA9IHt9O1xuICAgICAgdGhpcy51cGRhdGVMZW5ndGgoKTtcbiAgICAgIHRoaXMuc2F2ZSgpO1xuXG4gICAgICBMb2dnZXIubG9nSW50ZXJhY3Rpb24oTG9nZ2VyLmFjdGlvbnMuQk9PS01BUktfQ0xFQVIpO1xuICAgIH07XG5cbiAgICBwcm90by50b2dnbGUgPSBmdW5jdGlvbihjaGFydCkge1xuICAgICAgdmFyIHNob3J0aGFuZCA9IGNoYXJ0LnNob3J0aGFuZDtcblxuICAgICAgaWYgKHRoaXMuZGljdFtzaG9ydGhhbmRdKSB7XG4gICAgICAgIHRoaXMucmVtb3ZlKGNoYXJ0KTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHRoaXMuYWRkKGNoYXJ0KTtcbiAgICAgIH1cbiAgICB9O1xuXG4gICAgcHJvdG8uYWRkID0gZnVuY3Rpb24oY2hhcnQpIHtcbiAgICAgIHZhciBzaG9ydGhhbmQgPSBjaGFydC5zaG9ydGhhbmQ7XG5cbiAgICAgIGNvbnNvbGUubG9nKCdhZGRpbmcnLCBjaGFydC52bFNwZWMsIHNob3J0aGFuZCk7XG5cbiAgICAgIGNoYXJ0LnRpbWVBZGRlZCA9IChuZXcgRGF0ZSgpLmdldFRpbWUoKSk7XG5cbiAgICAgIGNoYXJ0LnN0YXRzID0gRGF0YXNldC5zdGF0cztcblxuICAgICAgdGhpcy5kaWN0W3Nob3J0aGFuZF0gPSBfLmNsb25lRGVlcChjaGFydCk7XG4gICAgICB0aGlzLnVwZGF0ZUxlbmd0aCgpO1xuICAgICAgdGhpcy5zYXZlKCk7XG5cbiAgICAgIExvZ2dlci5sb2dJbnRlcmFjdGlvbihMb2dnZXIuYWN0aW9ucy5CT09LTUFSS19BREQsIHNob3J0aGFuZCk7XG4gICAgfTtcblxuICAgIHByb3RvLnJlbW92ZSA9IGZ1bmN0aW9uKGNoYXJ0KSB7XG4gICAgICB2YXIgc2hvcnRoYW5kID0gY2hhcnQuc2hvcnRoYW5kO1xuXG4gICAgICBjb25zb2xlLmxvZygncmVtb3ZpbmcnLCBjaGFydC52bFNwZWMsIHNob3J0aGFuZCk7XG5cbiAgICAgIGRlbGV0ZSB0aGlzLmRpY3Rbc2hvcnRoYW5kXTtcbiAgICAgIHRoaXMudXBkYXRlTGVuZ3RoKCk7XG4gICAgICB0aGlzLnNhdmUoKTtcblxuICAgICAgTG9nZ2VyLmxvZ0ludGVyYWN0aW9uKExvZ2dlci5hY3Rpb25zLkJPT0tNQVJLX1JFTU9WRSwgc2hvcnRoYW5kKTtcbiAgICB9O1xuXG4gICAgcHJvdG8uaXNCb29rbWFya2VkID0gZnVuY3Rpb24oc2hvcnRoYW5kKSB7XG4gICAgICByZXR1cm4gc2hvcnRoYW5kIGluIHRoaXMuZGljdDtcbiAgICB9O1xuXG4gICAgcmV0dXJuIG5ldyBCb29rbWFya3MoKTtcbiAgfSk7XG4iLCIndXNlIHN0cmljdCc7XG5cbi8qKlxuICogQG5nZG9jIGRpcmVjdGl2ZVxuICogQG5hbWUgdmx1aS5kaXJlY3RpdmU6Ym9va21hcmtMaXN0XG4gKiBAZGVzY3JpcHRpb25cbiAqICMgYm9va21hcmtMaXN0XG4gKi9cbmFuZ3VsYXIubW9kdWxlKCd2bHVpJylcbiAgLmRpcmVjdGl2ZSgnYm9va21hcmtMaXN0JywgZnVuY3Rpb24gKEJvb2ttYXJrcywgY29uc3RzLCBMb2dnZXIpIHtcbiAgICByZXR1cm4ge1xuICAgICAgdGVtcGxhdGVVcmw6ICdib29rbWFya2xpc3QvYm9va21hcmtsaXN0Lmh0bWwnLFxuICAgICAgcmVzdHJpY3Q6ICdFJyxcbiAgICAgIHJlcGxhY2U6IHRydWUsXG4gICAgICBzY29wZToge1xuICAgICAgICBoaWdobGlnaHRlZDogJz0nXG4gICAgICB9LFxuICAgICAgbGluazogZnVuY3Rpb24gcG9zdExpbmsoc2NvcGUgLyosIGVsZW1lbnQsIGF0dHJzKi8pIHtcbiAgICAgICAgLy8gVGhlIGJvb2ttYXJrIGxpc3QgaXMgZGVzaWduZWQgdG8gcmVuZGVyIHdpdGhpbiBhIG1vZGFsIG92ZXJsYXkuXG4gICAgICAgIC8vIEJlY2F1c2UgbW9kYWwgY29udGVudHMgYXJlIGhpZGRlbiB2aWEgbmctaWYsIGlmIHRoaXMgbGluayBmdW5jdGlvbiBpc1xuICAgICAgICAvLyBleGVjdXRpbmcgaXQgaXMgYmVjYXVzZSB0aGUgZGlyZWN0aXZlIGlzIGJlaW5nIHNob3duLiBMb2cgdGhlIGV2ZW50OlxuICAgICAgICBMb2dnZXIubG9nSW50ZXJhY3Rpb24oTG9nZ2VyLmFjdGlvbnMuQk9PS01BUktfT1BFTik7XG4gICAgICAgIHNjb3BlLmxvZ0Jvb2ttYXJrc0Nsb3NlZCA9IGZ1bmN0aW9uKCkge1xuICAgICAgICAgIExvZ2dlci5sb2dJbnRlcmFjdGlvbihMb2dnZXIuYWN0aW9ucy5CT09LTUFSS19DTE9TRSk7XG4gICAgICAgIH07XG5cbiAgICAgICAgc2NvcGUuQm9va21hcmtzID0gQm9va21hcmtzO1xuICAgICAgICBzY29wZS5jb25zdHMgPSBjb25zdHM7XG4gICAgICB9XG4gICAgfTtcbiAgfSk7XG4iLCIndXNlIHN0cmljdCc7XG5cbi8vIFNlcnZpY2UgZm9yIHRoZSBzcGVjIGNvbmZpZy5cbi8vIFdlIGtlZXAgdGhpcyBzZXBhcmF0ZSBzbyB0aGF0IGNoYW5nZXMgYXJlIGtlcHQgZXZlbiBpZiB0aGUgc3BlYyBjaGFuZ2VzLlxuYW5ndWxhci5tb2R1bGUoJ3ZsdWknKVxuICAuZmFjdG9yeSgnQ29uZmlnJywgZnVuY3Rpb24odmwsIF8pIHtcbiAgICB2YXIgQ29uZmlnID0ge307XG5cbiAgICBDb25maWcuc2NoZW1hID0gdmwuc2NoZW1hLnNjaGVtYS5wcm9wZXJ0aWVzLmNvbmZpZztcbiAgICBDb25maWcuZGF0YXNjaGVtYSA9IHZsLnNjaGVtYS5zY2hlbWEucHJvcGVydGllcy5kYXRhO1xuXG4gICAgQ29uZmlnLmRhdGEgPSB2bC5zY2hlbWEudXRpbC5pbnN0YW50aWF0ZShDb25maWcuZGF0YXNjaGVtYSk7XG4gICAgQ29uZmlnLmNvbmZpZyA9IHZsLnNjaGVtYS51dGlsLmluc3RhbnRpYXRlKENvbmZpZy5zY2hlbWEpO1xuXG4gICAgQ29uZmlnLmdldENvbmZpZyA9IGZ1bmN0aW9uKCkge1xuICAgICAgcmV0dXJuIF8uY2xvbmVEZWVwKENvbmZpZy5jb25maWcpO1xuICAgIH07XG5cbiAgICBDb25maWcuZ2V0RGF0YSA9IGZ1bmN0aW9uKCkge1xuICAgICAgcmV0dXJuIENvbmZpZy5kYXRhO1xuICAgIH07XG5cbiAgICBDb25maWcubGFyZ2UgPSBmdW5jdGlvbigpIHtcbiAgICAgIHJldHVybiB7XG4gICAgICAgIHNpbmdsZVdpZHRoOiA0MDAsXG4gICAgICAgIHNpbmdsZUhlaWdodDogNDAwLFxuICAgICAgICBsYXJnZUJhbmRNYXhDYXJkaW5hbGl0eTogMjBcbiAgICAgIH07XG4gICAgfTtcblxuICAgIENvbmZpZy5zbWFsbCA9IGZ1bmN0aW9uKCkge1xuICAgICAgcmV0dXJuIHt9O1xuICAgIH07XG5cbiAgICBDb25maWcudXBkYXRlRGF0YXNldCA9IGZ1bmN0aW9uKGRhdGFzZXQsIHR5cGUpIHtcbiAgICAgIGlmIChkYXRhc2V0LnZhbHVlcykge1xuICAgICAgICBDb25maWcuZGF0YS52YWx1ZXMgPSBkYXRhc2V0LnZhbHVlcztcbiAgICAgICAgZGVsZXRlIENvbmZpZy5kYXRhLnVybDtcbiAgICAgICAgQ29uZmlnLmRhdGEuZm9ybWF0VHlwZSA9IHVuZGVmaW5lZDtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIENvbmZpZy5kYXRhLnVybCA9IGRhdGFzZXQudXJsO1xuICAgICAgICBkZWxldGUgQ29uZmlnLmRhdGEudmFsdWVzO1xuICAgICAgICBDb25maWcuZGF0YS5mb3JtYXRUeXBlID0gdHlwZTtcbiAgICAgIH1cbiAgICB9O1xuXG4gICAgcmV0dXJuIENvbmZpZztcbiAgfSk7XG4iLCIndXNlIHN0cmljdCc7XG5cbi8qKlxuICogQG5nZG9jIGRpcmVjdGl2ZVxuICogQG5hbWUgdmx1aS5kaXJlY3RpdmU6YWRkTXlyaWFEYXRhc2V0XG4gKiBAZGVzY3JpcHRpb25cbiAqICMgYWRkTXlyaWFEYXRhc2V0XG4gKi9cbmFuZ3VsYXIubW9kdWxlKCd2bHVpJylcbiAgLmRpcmVjdGl2ZSgnYWRkTXlyaWFEYXRhc2V0JywgZnVuY3Rpb24gKCRodHRwLCBEYXRhc2V0LCBjb25zdHMpIHtcbiAgICByZXR1cm4ge1xuICAgICAgdGVtcGxhdGVVcmw6ICdkYXRhc2V0L2FkZG15cmlhZGF0YXNldC5odG1sJyxcbiAgICAgIHJlc3RyaWN0OiAnRScsXG4gICAgICByZXF1aXJlOiAnP15ebW9kYWwnLFxuICAgICAgcmVwbGFjZTogdHJ1ZSxcbiAgICAgIHNjb3BlOiB0cnVlLFxuICAgICAgbGluazogZnVuY3Rpb24gcG9zdExpbmsoc2NvcGUsIGVsZW1lbnQsIGF0dHJzLCBtb2RhbENvbnRyb2xsZXIpIHtcbiAgICAgICAgLy8gSWYgdGhpcyBkaXJlY3RpdmUgb2NjdXJzIHdpdGhpbiBhIGEgbW9kYWwsIGdpdmUgb3Vyc2VsdmVzIGEgd2F5IHRvIGNsb3NlXG4gICAgICAgIC8vIHRoYXQgbW9kYWwgb25jZSB0aGUgYWRkIGJ1dHRvbiBoYXMgYmVlbiBjbGlja2VkXG4gICAgICAgIGZ1bmN0aW9uIGNsb3NlTW9kYWwoKSB7XG4gICAgICAgICAgaWYgKG1vZGFsQ29udHJvbGxlcikge1xuICAgICAgICAgICAgbW9kYWxDb250cm9sbGVyLmNsb3NlKCk7XG4gICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgLy8gSW5pdGlhbGl6ZSBzY29wZSB2YXJpYWJsZXNcbiAgICAgICAgc2NvcGUubXlyaWFSZXN0VXJsID0gY29uc3RzLm15cmlhUmVzdDtcbiAgICAgICAgc2NvcGUubXlyaWFEYXRhc2V0cyA9IFtdO1xuICAgICAgICBzY29wZS5teXJpYURhdGFzZXQgPSBudWxsO1xuXG4gICAgICAgIHNjb3BlLmxvYWREYXRhc2V0cyA9IGZ1bmN0aW9uKHF1ZXJ5KSB7XG4gICAgICAgICAgcmV0dXJuICRodHRwLmdldChzY29wZS5teXJpYVJlc3RVcmwgKyAnL2RhdGFzZXQvc2VhcmNoLz9xPScgKyBxdWVyeSlcbiAgICAgICAgICAgIC50aGVuKGZ1bmN0aW9uKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICAgIHNjb3BlLm15cmlhRGF0YXNldHMgPSByZXNwb25zZS5kYXRhO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH07XG5cbiAgICAgICAgLy8gTG9hZCB0aGUgYXZhaWxhYmxlIGRhdGFzZXRzIGZyb20gTXlyaWFcbiAgICAgICAgc2NvcGUubG9hZERhdGFzZXRzKCcnKTtcblxuICAgICAgICBzY29wZS5vcHRpb25OYW1lID0gZnVuY3Rpb24oZGF0YXNldCkge1xuICAgICAgICAgIHJldHVybiBkYXRhc2V0LnVzZXJOYW1lICsgJzonICsgZGF0YXNldC5wcm9ncmFtTmFtZSArICc6JyArIGRhdGFzZXQucmVsYXRpb25OYW1lO1xuICAgICAgICB9O1xuXG4gICAgICAgIHNjb3BlLmFkZERhdGFzZXQgPSBmdW5jdGlvbihteXJpYURhdGFzZXQpIHtcbiAgICAgICAgICB2YXIgZGF0YXNldCA9IHtcbiAgICAgICAgICAgIGdyb3VwOiAnbXlyaWEnLFxuICAgICAgICAgICAgbmFtZTogbXlyaWFEYXRhc2V0LnJlbGF0aW9uTmFtZSxcbiAgICAgICAgICAgIHVybDogc2NvcGUubXlyaWFSZXN0VXJsICsgJy9kYXRhc2V0L3VzZXItJyArIG15cmlhRGF0YXNldC51c2VyTmFtZSArXG4gICAgICAgICAgICAgICcvcHJvZ3JhbS0nICsgbXlyaWFEYXRhc2V0LnByb2dyYW1OYW1lICtcbiAgICAgICAgICAgICAgJy9yZWxhdGlvbi0nICsgbXlyaWFEYXRhc2V0LnJlbGF0aW9uTmFtZSArICcvZGF0YT9mb3JtYXQ9anNvbidcbiAgICAgICAgICB9O1xuXG4gICAgICAgICAgRGF0YXNldC50eXBlID0gJ2pzb24nO1xuICAgICAgICAgIERhdGFzZXQuZGF0YXNldCA9IERhdGFzZXQuYWRkKGRhdGFzZXQpO1xuICAgICAgICAgIERhdGFzZXQudXBkYXRlKERhdGFzZXQuZGF0YXNldCk7XG5cbiAgICAgICAgICBjbG9zZU1vZGFsKCk7XG4gICAgICAgIH07XG4gICAgICB9XG4gICAgfTtcbiAgfSk7XG4iLCIndXNlIHN0cmljdCc7XG5cbi8qKlxuICogQG5nZG9jIGRpcmVjdGl2ZVxuICogQG5hbWUgdmx1aS5kaXJlY3RpdmU6YWRkVXJsRGF0YXNldFxuICogQGRlc2NyaXB0aW9uXG4gKiAjIGFkZFVybERhdGFzZXRcbiAqL1xuYW5ndWxhci5tb2R1bGUoJ3ZsdWknKVxuICAuZGlyZWN0aXZlKCdhZGRVcmxEYXRhc2V0JywgZnVuY3Rpb24gKERhdGFzZXQsIExvZ2dlcikge1xuICAgIHJldHVybiB7XG4gICAgICB0ZW1wbGF0ZVVybDogJ2RhdGFzZXQvYWRkdXJsZGF0YXNldC5odG1sJyxcbiAgICAgIHJlc3RyaWN0OiAnRScsXG4gICAgICByZXF1aXJlOiAnP15ebW9kYWwnLFxuICAgICAgcmVwbGFjZTogdHJ1ZSxcbiAgICAgIHNjb3BlOiB0cnVlLFxuICAgICAgbGluazogZnVuY3Rpb24gcG9zdExpbmsoc2NvcGUsIGVsZW1lbnQsIGF0dHJzLCBtb2RhbENvbnRyb2xsZXIpIHtcbiAgICAgICAgLy8gSWYgdGhpcyBkaXJlY3RpdmUgb2NjdXJzIHdpdGhpbiBhIGEgbW9kYWwsIGdpdmUgb3Vyc2VsdmVzIGEgd2F5IHRvIGNsb3NlXG4gICAgICAgIC8vIHRoYXQgbW9kYWwgb25jZSB0aGUgYWRkIGJ1dHRvbiBoYXMgYmVlbiBjbGlja2VkXG4gICAgICAgIGZ1bmN0aW9uIGNsb3NlTW9kYWwoKSB7XG4gICAgICAgICAgaWYgKG1vZGFsQ29udHJvbGxlcikge1xuICAgICAgICAgICAgbW9kYWxDb250cm9sbGVyLmNsb3NlKCk7XG4gICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgLy8gdGhlIGRhdGFzZXQgdG8gYWRkXG4gICAgICAgIHNjb3BlLmFkZGVkRGF0YXNldCA9IHtcbiAgICAgICAgICBncm91cDogJ3VzZXInXG4gICAgICAgIH07XG5cbiAgICAgICAgc2NvcGUuYWRkRnJvbVVybCA9IGZ1bmN0aW9uKGRhdGFzZXQpIHtcbiAgICAgICAgICBMb2dnZXIubG9nSW50ZXJhY3Rpb24oTG9nZ2VyLmFjdGlvbnMuREFUQVNFVF9ORVdfVVJMLCBkYXRhc2V0LnVybCk7XG5cbiAgICAgICAgICAvLyBSZWdpc3RlciB0aGUgbmV3IGRhdGFzZXRcbiAgICAgICAgICBEYXRhc2V0LmRhdGFzZXQgPSBEYXRhc2V0LmFkZChkYXRhc2V0KTtcblxuICAgICAgICAgIC8vIEZldGNoICYgYWN0aXZhdGUgdGhlIG5ld2x5LXJlZ2lzdGVyZWQgZGF0YXNldFxuICAgICAgICAgIERhdGFzZXQudXBkYXRlKERhdGFzZXQuZGF0YXNldCk7XG5cbiAgICAgICAgICBjbG9zZU1vZGFsKCk7XG4gICAgICAgIH07XG4gICAgICB9XG4gICAgfTtcbiAgfSk7XG4iLCIndXNlIHN0cmljdCc7XG5cbi8qKlxuICogQG5nZG9jIGZpbHRlclxuICogQG5hbWUgdmVnYS1saXRlLXVpLmZpbHRlcjppbkdyb3VwXG4gKiBAZnVuY3Rpb25cbiAqIEBkZXNjcmlwdGlvblxuICogIyBpbkdyb3VwXG4gKiBHZXQgZGF0YXNldHMgaW4gYSBwYXJ0aWN1bGFyIGdyb3VwXG4gKiBAcGFyYW0gIHtTdHJpbmd9IGRhdGFzZXRHcm91cCBPbmUgb2YgXCJzYW1wbGUsXCIgXCJ1c2VyXCIsIG9yIFwibXlyaWFcIlxuICogQHJldHVybiB7QXJyYXl9IEFuIGFycmF5IG9mIGRhdGFzZXRzIGluIHRoZSBzcGVjaWZpZWQgZ3JvdXBcbiAqL1xuYW5ndWxhci5tb2R1bGUoJ3ZsdWknKVxuICAuZmlsdGVyKCdpbkdyb3VwJywgZnVuY3Rpb24oXykge1xuICAgIHJldHVybiBmdW5jdGlvbihhcnIsIGRhdGFzZXRHcm91cCkge1xuICAgICAgcmV0dXJuIF8ud2hlcmUoYXJyLCB7XG4gICAgICAgIGdyb3VwOiBkYXRhc2V0R3JvdXBcbiAgICAgIH0pO1xuICAgIH07XG4gIH0pO1xuXG4vKipcbiAqIEBuZ2RvYyBkaXJlY3RpdmVcbiAqIEBuYW1lIHZsdWkuZGlyZWN0aXZlOmNoYW5nZUxvYWRlZERhdGFzZXRcbiAqIEBkZXNjcmlwdGlvblxuICogIyBjaGFuZ2VMb2FkZWREYXRhc2V0XG4gKi9cbmFuZ3VsYXIubW9kdWxlKCd2bHVpJylcbiAgLmRpcmVjdGl2ZSgnY2hhbmdlTG9hZGVkRGF0YXNldCcsIGZ1bmN0aW9uIChEYXRhc2V0LCBfKSB7XG4gICAgcmV0dXJuIHtcbiAgICAgIHRlbXBsYXRlVXJsOiAnZGF0YXNldC9jaGFuZ2Vsb2FkZWRkYXRhc2V0Lmh0bWwnLFxuICAgICAgcmVzdHJpY3Q6ICdFJyxcbiAgICAgIHJlcXVpcmU6ICc/Xl5tb2RhbCcsXG4gICAgICByZXBsYWNlOiB0cnVlLFxuICAgICAgc2NvcGU6IHRydWUsXG4gICAgICBsaW5rOiBmdW5jdGlvbiBwb3N0TGluayhzY29wZSwgZWxlbWVudCwgYXR0cnMsIG1vZGFsQ29udHJvbGxlcikge1xuICAgICAgICAvLyBJZiB0aGlzIGRpcmVjdGl2ZSBvY2N1cnMgd2l0aGluIGEgYSBtb2RhbCwgZ2l2ZSBvdXJzZWx2ZXMgYSB3YXkgdG8gY2xvc2VcbiAgICAgICAgLy8gdGhhdCBtb2RhbCBvbmNlIHRoZSBhZGQgYnV0dG9uIGhhcyBiZWVuIGNsaWNrZWRcbiAgICAgICAgZnVuY3Rpb24gY2xvc2VNb2RhbCgpIHtcbiAgICAgICAgICBpZiAobW9kYWxDb250cm9sbGVyKSB7XG4gICAgICAgICAgICBtb2RhbENvbnRyb2xsZXIuY2xvc2UoKTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICAvLyBFeHBvc2UgZGF0YXNldCBvYmplY3QgaXRzZWxmIHNvIGN1cnJlbnQgZGF0YXNldCBjYW4gYmUgbWFya2VkXG4gICAgICAgIHNjb3BlLkRhdGFzZXQgPSBEYXRhc2V0O1xuXG4gICAgICAgIHNjb3BlLnVzZXJEYXRhID0gXy5maWx0ZXIoRGF0YXNldC5kYXRhc2V0cywgZnVuY3Rpb24oZGF0YXNldCkge1xuICAgICAgICAgIHJldHVybiBkYXRhc2V0Lmdyb3VwICE9PSAnc2FtcGxlJztcbiAgICAgICAgfSk7XG5cbiAgICAgICAgc2NvcGUuc2FtcGxlRGF0YSA9IF8ud2hlcmUoRGF0YXNldC5kYXRhc2V0cywge1xuICAgICAgICAgIGdyb3VwOiAnc2FtcGxlJ1xuICAgICAgICB9KTtcblxuICAgICAgICBzY29wZS4kd2F0Y2goZnVuY3Rpb24oKSB7XG4gICAgICAgICAgcmV0dXJuIERhdGFzZXQuZGF0YXNldHMubGVuZ3RoO1xuICAgICAgICB9LCBmdW5jdGlvbigpIHtcbiAgICAgICAgICBzY29wZS51c2VyRGF0YSA9IF8uZmlsdGVyKERhdGFzZXQuZGF0YXNldHMsIGZ1bmN0aW9uKGRhdGFzZXQpIHtcbiAgICAgICAgICAgIHJldHVybiBkYXRhc2V0Lmdyb3VwICE9PSAnc2FtcGxlJztcbiAgICAgICAgICB9KTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgc2NvcGUuc2VsZWN0RGF0YXNldCA9IGZ1bmN0aW9uKGRhdGFzZXQpIHtcbiAgICAgICAgICAvLyBBY3RpdmF0ZSB0aGUgc2VsZWN0ZWQgZGF0YXNldFxuICAgICAgICAgIERhdGFzZXQudXBkYXRlKGRhdGFzZXQpO1xuICAgICAgICAgIGNsb3NlTW9kYWwoKTtcbiAgICAgICAgfTtcbiAgICAgIH1cbiAgICB9O1xuICB9KTtcbiIsIid1c2Ugc3RyaWN0JztcblxuZnVuY3Rpb24gZ2V0TmFtZU1hcChkYXRhc2NoZW1hKSB7XG4gIHJldHVybiBkYXRhc2NoZW1hLnJlZHVjZShmdW5jdGlvbihtLCBmaWVsZCkge1xuICAgIG1bZmllbGQubmFtZV0gPSBmaWVsZDtcbiAgICByZXR1cm4gbTtcbiAgfSwge30pO1xufVxuXG5hbmd1bGFyLm1vZHVsZSgndmx1aScpXG4gIC5mYWN0b3J5KCdEYXRhc2V0JywgZnVuY3Rpb24oJGh0dHAsICRxLCBBbGVydHMsIF8sIGRsLCB2bCwgU2FtcGxlRGF0YSwgQ29uZmlnLCBMb2dnZXIpIHtcbiAgICB2YXIgRGF0YXNldCA9IHt9O1xuXG4gICAgLy8gU3RhcnQgd2l0aCB0aGUgbGlzdCBvZiBzYW1wbGUgZGF0YXNldHNcbiAgICB2YXIgZGF0YXNldHMgPSBTYW1wbGVEYXRhO1xuXG4gICAgRGF0YXNldC5kYXRhc2V0cyA9IGRhdGFzZXRzO1xuICAgIERhdGFzZXQuZGF0YXNldCA9IGRhdGFzZXRzWzFdO1xuICAgIERhdGFzZXQuY3VycmVudERhdGFzZXQgPSB1bmRlZmluZWQ7ICAvLyBkYXRhc2V0IGJlZm9yZSB1cGRhdGVcbiAgICBEYXRhc2V0LmRhdGFzY2hlbWEgPSBbXTtcbiAgICBEYXRhc2V0LmRhdGFzY2hlbWEuYnlOYW1lID0ge307XG4gICAgRGF0YXNldC5zdGF0cyA9IHt9O1xuICAgIERhdGFzZXQudHlwZSA9IHVuZGVmaW5lZDtcblxuICAgIHZhciB0eXBlT3JkZXIgPSB7XG4gICAgICBOOiAwLFxuICAgICAgTzogMCxcbiAgICAgIEc6IDIsXG4gICAgICBUOiAzLFxuICAgICAgUTogNFxuICAgIH07XG5cbiAgICBEYXRhc2V0LmZpZWxkT3JkZXJCeSA9IHt9O1xuXG4gICAgRGF0YXNldC5maWVsZE9yZGVyQnkudHlwZSA9IGZ1bmN0aW9uKGZpZWxkKSB7XG4gICAgICBpZiAoZmllbGQuYWdncmVnYXRlPT09J2NvdW50JykgcmV0dXJuIDQ7XG4gICAgICByZXR1cm4gdHlwZU9yZGVyW2ZpZWxkLnR5cGVdO1xuICAgIH07XG5cbiAgICBEYXRhc2V0LmZpZWxkT3JkZXJCeS50eXBlVGhlbk5hbWUgPSBmdW5jdGlvbihmaWVsZCkge1xuICAgICAgcmV0dXJuIERhdGFzZXQuZmllbGRPcmRlckJ5LnR5cGUoZmllbGQpICsgJ18nICtcbiAgICAgICAgKGZpZWxkLmFnZ3JlZ2F0ZSA9PT0gJ2NvdW50JyA/ICd+JyA6IGZpZWxkLm5hbWUudG9Mb3dlckNhc2UoKSk7XG4gICAgICAgIC8vIH4gaXMgdGhlIGxhc3QgY2hhcmFjdGVyIGluIEFTQ0lJXG4gICAgfTtcblxuICAgIERhdGFzZXQuZmllbGRPcmRlckJ5Lm9yaWdpbmFsID0gZnVuY3Rpb24oKSB7XG4gICAgICByZXR1cm4gMDsgLy8gbm8gc3dhcCB3aWxsIG9jY3VyXG4gICAgfTtcblxuICAgIERhdGFzZXQuZmllbGRPcmRlckJ5Lm5hbWUgPSBmdW5jdGlvbihmaWVsZCkge1xuICAgICAgcmV0dXJuIGZpZWxkLm5hbWU7XG4gICAgfTtcblxuICAgIERhdGFzZXQuZmllbGRPcmRlckJ5LmNhcmRpbmFsaXR5ID0gZnVuY3Rpb24oZmllbGQsIHN0YXRzKSB7XG4gICAgICByZXR1cm4gc3RhdHNbZmllbGQubmFtZV0uZGlzdGluY3Q7XG4gICAgfTtcblxuICAgIERhdGFzZXQuZmllbGRPcmRlciA9IERhdGFzZXQuZmllbGRPcmRlckJ5LnR5cGVUaGVuTmFtZTtcblxuICAgIERhdGFzZXQuZ2V0U2NoZW1hID0gZnVuY3Rpb24oZGF0YSwgc3RhdHMsIG9yZGVyKSB7XG4gICAgICB2YXIgdHlwZXMgPSBkbC50eXBlLmluZmVyQWxsKGRhdGEpLFxuICAgICAgICBzY2hlbWEgPSBfLnJlZHVjZSh0eXBlcywgZnVuY3Rpb24ocywgdHlwZSwgbmFtZSkge1xuICAgICAgICAgIHZhciBmaWVsZCA9IHtcbiAgICAgICAgICAgIG5hbWU6IG5hbWUsXG4gICAgICAgICAgICB0eXBlOiB2bC5kYXRhLnR5cGVzW3R5cGVdLFxuICAgICAgICAgICAgcHJpbWl0aXZlVHlwZTogdHlwZVxuICAgICAgICAgIH07XG5cbiAgICAgICAgICBpZiAoZmllbGQudHlwZSA9PT0gJ1EnICYmIHN0YXRzW2ZpZWxkLm5hbWVdLmRpc3RpbmN0IDw9IDUpIHtcbiAgICAgICAgICAgIGZpZWxkLnR5cGUgPSAnTyc7XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgcy5wdXNoKGZpZWxkKTtcbiAgICAgICAgICByZXR1cm4gcztcbiAgICAgICAgfSwgW10pO1xuXG4gICAgICBzY2hlbWEgPSBkbC5zdGFibGVzb3J0KHNjaGVtYSwgb3JkZXIgfHwgRGF0YXNldC5maWVsZE9yZGVyQnkudHlwZVRoZW5OYW1lLCBEYXRhc2V0LmZpZWxkT3JkZXJCeS5uYW1lKTtcblxuICAgICAgc2NoZW1hLnB1c2godmwuZW5jRGVmLmNvdW50KCkpO1xuICAgICAgcmV0dXJuIHNjaGVtYTtcbiAgICB9O1xuXG4gICAgLy8gdXBkYXRlIHRoZSBzY2hlbWEgYW5kIHN0YXRzXG4gICAgRGF0YXNldC5vblVwZGF0ZSA9IFtdO1xuXG4gICAgRGF0YXNldC51cGRhdGUgPSBmdW5jdGlvbihkYXRhc2V0KSB7XG4gICAgICB2YXIgdXBkYXRlUHJvbWlzZTtcblxuICAgICAgTG9nZ2VyLmxvZ0ludGVyYWN0aW9uKExvZ2dlci5hY3Rpb25zLkRBVEFTRVRfQ0hBTkdFLCBkYXRhc2V0Lm5hbWUpO1xuXG4gICAgICBpZiAoZGF0YXNldC52YWx1ZXMpIHtcbiAgICAgICAgdXBkYXRlUHJvbWlzZSA9ICRxKGZ1bmN0aW9uKHJlc29sdmUsIHJlamVjdCkge1xuICAgICAgICAgIC8vIGpzaGludCB1bnVzZWQ6ZmFsc2VcbiAgICAgICAgICBEYXRhc2V0LnR5cGUgPSB1bmRlZmluZWQ7XG4gICAgICAgICAgRGF0YXNldC51cGRhdGVGcm9tRGF0YShkYXRhc2V0LCBkYXRhc2V0LnZhbHVlcyk7XG4gICAgICAgICAgcmVzb2x2ZSgpO1xuICAgICAgICB9KTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHVwZGF0ZVByb21pc2UgPSAkaHR0cC5nZXQoZGF0YXNldC51cmwsIHtjYWNoZTogdHJ1ZX0pLnRoZW4oZnVuY3Rpb24ocmVzcG9uc2UpIHtcbiAgICAgICAgICB2YXIgZGF0YTtcblxuICAgICAgICAgIC8vIGZpcnN0IHNlZSB3aGV0aGVyIHRoZSBkYXRhIGlzIEpTT04sIG90aGVyd2lzZSB0cnkgdG8gcGFyc2UgQ1NWXG4gICAgICAgICAgaWYgKF8uaXNPYmplY3QocmVzcG9uc2UuZGF0YSkpIHtcbiAgICAgICAgICAgICBkYXRhID0gcmVzcG9uc2UuZGF0YTtcbiAgICAgICAgICAgICBEYXRhc2V0LnR5cGUgPSAnanNvbic7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGRhdGEgPSBkbC5yZWFkKHJlc3BvbnNlLmRhdGEsIHt0eXBlOiAnY3N2J30pO1xuICAgICAgICAgICAgRGF0YXNldC50eXBlID0gJ2Nzdic7XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgRGF0YXNldC51cGRhdGVGcm9tRGF0YShkYXRhc2V0LCBkYXRhKTtcbiAgICAgICAgfSk7XG4gICAgICB9XG5cbiAgICAgIERhdGFzZXQub25VcGRhdGUuZm9yRWFjaChmdW5jdGlvbihsaXN0ZW5lcikge1xuICAgICAgICB1cGRhdGVQcm9taXNlID0gdXBkYXRlUHJvbWlzZS50aGVuKGxpc3RlbmVyKTtcbiAgICAgIH0pO1xuXG4gICAgICAvLyBDb3B5IHRoZSBkYXRhc2V0IGludG8gdGhlIGNvbmZpZyBzZXJ2aWNlIG9uY2UgaXQgaXMgcmVhZHlcbiAgICAgIHVwZGF0ZVByb21pc2UudGhlbihmdW5jdGlvbigpIHtcbiAgICAgICAgQ29uZmlnLnVwZGF0ZURhdGFzZXQoZGF0YXNldCwgRGF0YXNldC50eXBlKTtcbiAgICAgIH0pO1xuXG4gICAgICByZXR1cm4gdXBkYXRlUHJvbWlzZTtcbiAgICB9O1xuXG4gICAgRGF0YXNldC51cGRhdGVGcm9tRGF0YSA9IGZ1bmN0aW9uKGRhdGFzZXQsIGRhdGEpIHtcbiAgICAgIERhdGFzZXQuZGF0YSA9IGRhdGE7XG5cbiAgICAgIERhdGFzZXQuY3VycmVudERhdGFzZXQgPSBkYXRhc2V0O1xuICAgICAgRGF0YXNldC5zdGF0cyA9IHZsLmRhdGEuc3RhdHMoRGF0YXNldC5kYXRhKTtcblxuICAgICAgZm9yICh2YXIgZmllbGROYW1lIGluIERhdGFzZXQuc3RhdHMpIHtcbiAgICAgICAgaWYgKGZpZWxkTmFtZSAhPT0gJyonKSB7XG4gICAgICAgICAgRGF0YXNldC5zdGF0c1tmaWVsZE5hbWVdLnNhbXBsZSA9IF8uc2FtcGxlKF8ucGx1Y2soRGF0YXNldC5kYXRhLCBmaWVsZE5hbWUpLCA3KTtcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICBEYXRhc2V0LmRhdGFzY2hlbWEgPSBEYXRhc2V0LmdldFNjaGVtYShEYXRhc2V0LmRhdGEsIERhdGFzZXQuc3RhdHMpO1xuICAgICAgRGF0YXNldC5kYXRhc2NoZW1hLmJ5TmFtZSA9IGdldE5hbWVNYXAoRGF0YXNldC5kYXRhc2NoZW1hKTtcbiAgICB9O1xuXG4gICAgRGF0YXNldC5hZGQgPSBmdW5jdGlvbihkYXRhc2V0KSB7XG4gICAgICBpZiAoIWRhdGFzZXQuaWQpIHtcbiAgICAgICAgZGF0YXNldC5pZCA9IGRhdGFzZXQudXJsO1xuICAgICAgfVxuICAgICAgZGF0YXNldHMucHVzaChkYXRhc2V0KTtcblxuICAgICAgcmV0dXJuIGRhdGFzZXQ7XG4gICAgfTtcblxuICAgIHJldHVybiBEYXRhc2V0O1xuICB9KTtcbiIsIid1c2Ugc3RyaWN0JztcblxuLyoqXG4gKiBAbmdkb2MgZGlyZWN0aXZlXG4gKiBAbmFtZSB2bHVpLmRpcmVjdGl2ZTpkYXRhc2V0TW9kYWxcbiAqIEBkZXNjcmlwdGlvblxuICogIyBkYXRhc2V0TW9kYWxcbiAqL1xuYW5ndWxhci5tb2R1bGUoJ3ZsdWknKVxuICAuZGlyZWN0aXZlKCdkYXRhc2V0TW9kYWwnLCBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIHtcbiAgICAgIHRlbXBsYXRlVXJsOiAnZGF0YXNldC9kYXRhc2V0bW9kYWwuaHRtbCcsXG4gICAgICByZXN0cmljdDogJ0UnLFxuICAgICAgc2NvcGU6IGZhbHNlXG4gICAgfTtcbiAgfSk7XG4iLCIndXNlIHN0cmljdCc7XG5cbmFuZ3VsYXIubW9kdWxlKCd2bHVpJylcbiAgLmRpcmVjdGl2ZSgnZGF0YXNldFNlbGVjdG9yJywgZnVuY3Rpb24oTW9kYWxzLCBMb2dnZXIpIHtcbiAgICByZXR1cm4ge1xuICAgICAgdGVtcGxhdGVVcmw6ICdkYXRhc2V0L2RhdGFzZXRzZWxlY3Rvci5odG1sJyxcbiAgICAgIHJlc3RyaWN0OiAnRScsXG4gICAgICByZXBsYWNlOiB0cnVlLFxuICAgICAgc2NvcGU6IHt9LFxuICAgICAgbGluazogZnVuY3Rpb24gcG9zdExpbmsoc2NvcGUvKiwgZWxlbWVudCwgYXR0cnMqLykge1xuICAgICAgICBzY29wZS5sb2FkRGF0YXNldCA9IGZ1bmN0aW9uKCkge1xuICAgICAgICAgIExvZ2dlci5sb2dJbnRlcmFjdGlvbihMb2dnZXIuYWN0aW9ucy5EQVRBU0VUX09QRU4pO1xuICAgICAgICAgIE1vZGFscy5vcGVuKCdkYXRhc2V0LW1vZGFsJyk7XG4gICAgICAgIH07XG4gICAgICB9XG4gICAgfTtcbiAgfSk7XG4iLCIndXNlIHN0cmljdCc7XG5cbi8qKlxuICogQG5nZG9jIGRpcmVjdGl2ZVxuICogQG5hbWUgdmx1aS5kaXJlY3RpdmU6ZmlsZURyb3B6b25lXG4gKiBAZGVzY3JpcHRpb25cbiAqICMgZmlsZURyb3B6b25lXG4gKi9cbmFuZ3VsYXIubW9kdWxlKCd2bHVpJylcbiAgLy8gQWRkIHRoZSBmaWxlIHJlYWRlciBhcyBhIG5hbWVkIGRlcGVuZGVuY3lcbiAgLmNvbnN0YW50KCdGaWxlUmVhZGVyJywgd2luZG93LkZpbGVSZWFkZXIpXG4gIC5kaXJlY3RpdmUoJ2ZpbGVEcm9wem9uZScsIGZ1bmN0aW9uIChNb2RhbHMsIEFsZXJ0cywgRmlsZVJlYWRlcikge1xuXG4gICAgLy8gSGVscGVyIG1ldGhvZHNcblxuICAgIGZ1bmN0aW9uIGlzU2l6ZVZhbGlkKHNpemUsIG1heFNpemUpIHtcbiAgICAgIC8vIFNpemUgaXMgcHJvdmlkZWQgaW4gYnl0ZXM7IG1heFNpemUgaXMgcHJvdmlkZWQgaW4gbWVnYWJ5dGVzXG4gICAgICAvLyBDb2VyY2UgbWF4U2l6ZSB0byBhIG51bWJlciBpbiBjYXNlIGl0IGNvbWVzIGluIGFzIGEgc3RyaW5nLFxuICAgICAgLy8gJiByZXR1cm4gdHJ1ZSB3aGVuIG1heCBmaWxlIHNpemUgd2FzIG5vdCBzcGVjaWZpZWQsIGlzIGVtcHR5LFxuICAgICAgLy8gb3IgaXMgc3VmZmljaWVudGx5IGxhcmdlXG4gICAgICByZXR1cm4gIW1heFNpemUgfHwgKCBzaXplIC8gMTAyNCAvIDEwMjQgPCArbWF4U2l6ZSApO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGlzVHlwZVZhbGlkKHR5cGUsIHZhbGlkTWltZVR5cGVzKSB7XG4gICAgICAgIC8vIElmIG5vIG1pbWUgdHlwZSByZXN0cmljdGlvbnMgd2VyZSBwcm92aWRlZCwgb3IgdGhlIHByb3ZpZGVkIGZpbGUnc1xuICAgICAgICAvLyB0eXBlIGlzIHdoaXRlbGlzdGVkLCB0eXBlIGlzIHZhbGlkXG4gICAgICByZXR1cm4gIXZhbGlkTWltZVR5cGVzIHx8ICggdmFsaWRNaW1lVHlwZXMuaW5kZXhPZih0eXBlKSA+IC0xICk7XG4gICAgfVxuXG4gICAgcmV0dXJuIHtcbiAgICAgIHRlbXBsYXRlVXJsOiAnZGF0YXNldC9maWxlZHJvcHpvbmUuaHRtbCcsXG4gICAgICByZXBsYWNlOiB0cnVlLFxuICAgICAgcmVzdHJpY3Q6ICdFJyxcbiAgICAgIC8vIFBlcm1pdCBhcmJpdHJhcnkgY2hpbGQgY29udGVudFxuICAgICAgdHJhbnNjbHVkZTogdHJ1ZSxcbiAgICAgIHNjb3BlOiB7XG4gICAgICAgIG1heEZpbGVTaXplOiAnQCcsXG4gICAgICAgIHZhbGlkTWltZVR5cGVzOiAnQCcsXG4gICAgICAgIC8vIEV4cG9zZSB0aGlzIGRpcmVjdGl2ZSdzIGRhdGFzZXQgcHJvcGVydHkgdG8gcGFyZW50IHNjb3BlcyB0aHJvdWdoXG4gICAgICAgIC8vIHR3by13YXkgZGF0YWJpbmRpbmdcbiAgICAgICAgZGF0YXNldDogJz0nXG4gICAgICB9LFxuICAgICAgbGluazogZnVuY3Rpb24gKHNjb3BlLCBlbGVtZW50LyosIGF0dHJzKi8pIHtcbiAgICAgICAgc2NvcGUuZGF0YXNldCA9IHNjb3BlLmRhdGFzZXQgfHwge307XG5cbiAgICAgICAgZWxlbWVudC5vbignZHJhZ292ZXIgZHJhZ2VudGVyJywgZnVuY3Rpb24gb25EcmFnRW50ZXIoZXZlbnQpIHtcbiAgICAgICAgICBpZiAoZXZlbnQpIHtcbiAgICAgICAgICAgIGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgfVxuICAgICAgICAgIGV2ZW50Lm9yaWdpbmFsRXZlbnQuZGF0YVRyYW5zZmVyLmVmZmVjdEFsbG93ZWQgPSAnY29weSc7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIGZ1bmN0aW9uIHJlYWRGaWxlKGZpbGUpIHtcbiAgICAgICAgICBpZiAoIWlzVHlwZVZhbGlkKGZpbGUudHlwZSwgc2NvcGUudmFsaWRNaW1lVHlwZXMpKSB7XG4gICAgICAgICAgICBzY29wZS4kYXBwbHkoZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgIEFsZXJ0cy5hZGQoJ0ludmFsaWQgZmlsZSB0eXBlLiBGaWxlIG11c3QgYmUgb25lIG9mIGZvbGxvd2luZyB0eXBlczogJyArIHNjb3BlLnZhbGlkTWltZVR5cGVzKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgIH1cbiAgICAgICAgICBpZiAoIWlzU2l6ZVZhbGlkKGZpbGUuc2l6ZSwgc2NvcGUubWF4RmlsZVNpemUpKSB7XG4gICAgICAgICAgICBzY29wZS4kYXBwbHkoZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgIEFsZXJ0cy5hZGQoJ0ZpbGUgbXVzdCBiZSBzbWFsbGVyIHRoYW4gJyArIHNjb3BlLm1heEZpbGVTaXplICsgJyBNQicpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgfVxuICAgICAgICAgIHZhciByZWFkZXIgPSBuZXcgRmlsZVJlYWRlcigpO1xuXG4gICAgICAgICAgcmVhZGVyLm9ubG9hZCA9IGZ1bmN0aW9uKGV2dCkge1xuICAgICAgICAgICAgcmV0dXJuIHNjb3BlLiRhcHBseShmdW5jdGlvbihzY29wZSkge1xuICAgICAgICAgICAgICBzY29wZS5kYXRhc2V0LmRhdGEgPSBldnQudGFyZ2V0LnJlc3VsdDtcbiAgICAgICAgICAgICAgLy8gU3RyaXAgZmlsZSBuYW1lIGV4dGVuc2lvbnMgZnJvbSB0aGUgdXBsb2FkZWQgZGF0YVxuICAgICAgICAgICAgICBzY29wZS5kYXRhc2V0Lm5hbWUgPSBmaWxlLm5hbWUucmVwbGFjZSgvXFwuXFx3KyQvLCAnJyk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICB9O1xuXG4gICAgICAgICAgcmVhZGVyLm9uZXJyb3IgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIEFsZXJ0cy5hZGQoJ0Vycm9yIHJlYWRpbmcgZmlsZScpO1xuICAgICAgICAgIH07XG5cbiAgICAgICAgICByZWFkZXIucmVhZEFzVGV4dChmaWxlKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGVsZW1lbnQub24oJ2Ryb3AnLCBmdW5jdGlvbiBvbkRyb3AoZXZlbnQpIHtcbiAgICAgICAgICBpZiAoZXZlbnQpIHtcbiAgICAgICAgICAgIGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgcmVhZEZpbGUoZXZlbnQub3JpZ2luYWxFdmVudC5kYXRhVHJhbnNmZXIuZmlsZXNbMF0pO1xuICAgICAgICB9KTtcblxuICAgICAgICBlbGVtZW50LmZpbmQoJ2lucHV0W3R5cGU9XCJmaWxlXCJdJykub24oJ2NoYW5nZScsIGZ1bmN0aW9uIG9uVXBsb2FkKC8qZXZlbnQqLykge1xuICAgICAgICAgIC8vIFwidGhpc1wiIGlzIHRoZSBpbnB1dCBlbGVtZW50XG4gICAgICAgICAgcmVhZEZpbGUodGhpcy5maWxlc1swXSk7XG4gICAgICAgIH0pO1xuICAgICAgfVxuXG4gICAgfTtcbiAgfSk7XG4iLCIndXNlIHN0cmljdCc7XG5cbi8qKlxuICogQG5nZG9jIGRpcmVjdGl2ZVxuICogQG5hbWUgdmx1aS5kaXJlY3RpdmU6cGFzdGVEYXRhc2V0XG4gKiBAZGVzY3JpcHRpb25cbiAqICMgcGFzdGVEYXRhc2V0XG4gKi9cbmFuZ3VsYXIubW9kdWxlKCd2bHVpJylcbiAgLmRpcmVjdGl2ZSgncGFzdGVEYXRhc2V0JywgZnVuY3Rpb24gKERhdGFzZXQsIExvZ2dlciwgQ29uZmlnLCBfLCBkbCkge1xuICAgIHJldHVybiB7XG4gICAgICB0ZW1wbGF0ZVVybDogJ2RhdGFzZXQvcGFzdGVkYXRhc2V0Lmh0bWwnLFxuICAgICAgcmVzdHJpY3Q6ICdFJyxcbiAgICAgIHJlcXVpcmU6ICc/Xl5tb2RhbCcsXG4gICAgICByZXBsYWNlOiB0cnVlLFxuICAgICAgc2NvcGU6IHRydWUsXG4gICAgICBsaW5rOiBmdW5jdGlvbiBwb3N0TGluayhzY29wZSwgZWxlbWVudCwgYXR0cnMsIG1vZGFsQ29udHJvbGxlcikge1xuICAgICAgICAvLyBJZiB0aGlzIGRpcmVjdGl2ZSBvY2N1cnMgd2l0aGluIGEgYSBtb2RhbCwgZ2l2ZSBvdXJzZWx2ZXMgYSB3YXkgdG8gY2xvc2VcbiAgICAgICAgLy8gdGhhdCBtb2RhbCBvbmNlIHRoZSBhZGQgYnV0dG9uIGhhcyBiZWVuIGNsaWNrZWRcbiAgICAgICAgZnVuY3Rpb24gY2xvc2VNb2RhbCgpIHtcbiAgICAgICAgICBpZiAobW9kYWxDb250cm9sbGVyKSB7XG4gICAgICAgICAgICBtb2RhbENvbnRyb2xsZXIuY2xvc2UoKTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICAvLyBJbml0aWFsaXplIHNjb3BlIHZhcmlhYmxlc1xuICAgICAgICBzY29wZS5kYXRhc2V0ID0ge1xuICAgICAgICAgIG5hbWU6ICcnLFxuICAgICAgICAgIGRhdGE6ICcnXG4gICAgICAgIH07XG5cbiAgICAgICAgc2NvcGUuYWRkRGF0YXNldCA9IGZ1bmN0aW9uKCkge1xuICAgICAgICAgIHZhciBkYXRhID0gZGwucmVhZChzY29wZS5kYXRhc2V0LmRhdGEsIHtcbiAgICAgICAgICAgIHR5cGU6ICdjc3YnXG4gICAgICAgICAgfSk7XG5cbiAgICAgICAgICB2YXIgcGFzdGVkRGF0YXNldCA9IHtcbiAgICAgICAgICAgIGlkOiBEYXRlLm5vdygpLCAgLy8gdGltZSBhcyBpZFxuICAgICAgICAgICAgbmFtZTogc2NvcGUuZGF0YXNldC5uYW1lLFxuICAgICAgICAgICAgdmFsdWVzOiBkYXRhLFxuICAgICAgICAgICAgZ3JvdXA6ICdwYXN0ZWQnXG4gICAgICAgICAgfTtcblxuICAgICAgICAgIC8vIExvZyB0aGF0IHdlIGhhdmUgcGFzdGVkIGRhdGFcbiAgICAgICAgICBMb2dnZXIubG9nSW50ZXJhY3Rpb24oTG9nZ2VyLmFjdGlvbnMuREFUQVNFVF9ORVdfUEFTVEUsIHBhc3RlZERhdGFzZXQubmFtZSk7XG5cbiAgICAgICAgICAvLyBSZWdpc3RlciB0aGUgcGFzdGVkIGRhdGEgYXMgYSBuZXcgZGF0YXNldFxuICAgICAgICAgIERhdGFzZXQuZGF0YXNldCA9IERhdGFzZXQuYWRkKHBhc3RlZERhdGFzZXQpO1xuXG4gICAgICAgICAgLy8gQWN0aXZhdGUgdGhlIG5ld2x5LXJlZ2lzdGVyZWQgZGF0YXNldFxuICAgICAgICAgIERhdGFzZXQudXBkYXRlKERhdGFzZXQuZGF0YXNldCk7XG5cbiAgICAgICAgICAvLyBDbG9zZSB0aGlzIGRpcmVjdGl2ZSdzIGNvbnRhaW5pbmcgbW9kYWxcbiAgICAgICAgICBjbG9zZU1vZGFsKCk7XG4gICAgICAgIH07XG4gICAgICB9XG4gICAgfTtcbiAgfSk7XG4iLCJhbmd1bGFyLm1vZHVsZSgndmx1aScpLmNvbnN0YW50KCdTYW1wbGVEYXRhJywgW3tcbiAgbmFtZTogJ0JhcmxleScsXG4gIGRlc2NyaXB0aW9uOiAnQmFybGV5IHlpZWxkIGJ5IHZhcmlldHkgYWNyb3NzIHRoZSB1cHBlciBtaWR3ZXN0IGluIDE5MzEgYW5kIDE5MzInLFxuICB1cmw6ICdkYXRhL2JhcmxleS5qc29uJyxcbiAgaWQ6ICdiYXJsZXknLFxuICBncm91cDogJ3NhbXBsZSdcbn0se1xuICBuYW1lOiAnQ2FycycsXG4gIGRlc2NyaXB0aW9uOiAnQXV0b21vdGl2ZSBzdGF0aXN0aWNzIGZvciBhIHZhcmlldHkgb2YgY2FyIG1vZGVscyBiZXR3ZWVuIDE5NzAgJiAxOTgyJyxcbiAgdXJsOiAnZGF0YS9jYXJzLmpzb24nLFxuICBpZDogJ2NhcnMnLFxuICBncm91cDogJ3NhbXBsZSdcbn0se1xuICBuYW1lOiAnQ3JpbWVhJyxcbiAgdXJsOiAnZGF0YS9jcmltZWEuanNvbicsXG4gIGlkOiAnY3JpbWVhJyxcbiAgZ3JvdXA6ICdzYW1wbGUnXG59LHtcbiAgbmFtZTogJ0RyaXZpbmcnLFxuICB1cmw6ICdkYXRhL2RyaXZpbmcuanNvbicsXG4gIGlkOiAnZHJpdmluZycsXG4gIGdyb3VwOiAnc2FtcGxlJ1xufSx7XG4gIG5hbWU6ICdJcmlzJyxcbiAgdXJsOiAnZGF0YS9pcmlzLmpzb24nLFxuICBpZDogJ2lyaXMnLFxuICBncm91cDogJ3NhbXBsZSdcbn0se1xuICBuYW1lOiAnSm9icycsXG4gIHVybDogJ2RhdGEvam9icy5qc29uJyxcbiAgaWQ6ICdqb2JzJyxcbiAgZ3JvdXA6ICdzYW1wbGUnXG59LHtcbiAgbmFtZTogJ1BvcHVsYXRpb24nLFxuICB1cmw6ICdkYXRhL3BvcHVsYXRpb24uanNvbicsXG4gIGlkOiAncG9wdWxhdGlvbicsXG4gIGdyb3VwOiAnc2FtcGxlJ1xufSx7XG4gIG5hbWU6ICdNb3ZpZXMnLFxuICB1cmw6ICdkYXRhL21vdmllcy5qc29uJyxcbiAgaWQ6ICdtb3ZpZXMnLFxuICBncm91cDogJ3NhbXBsZSdcbn0se1xuICBuYW1lOiAnQmlyZHN0cmlrZXMnLFxuICB1cmw6ICdkYXRhL2JpcmRzdHJpa2VzLmpzb24nLFxuICBpZDogJ2JpcmRzdHJpa2VzJyxcbiAgZ3JvdXA6ICdzYW1wbGUnXG59LHtcbiAgbmFtZTogJ0J1cnRpbicsXG4gIHVybDogJ2RhdGEvYnVydGluLmpzb24nLFxuICBpZDogJ2J1cnRpbicsXG4gIGdyb3VwOiAnc2FtcGxlJ1xufSx7XG4gIG5hbWU6ICdCdWRnZXQgMjAxNicsXG4gIHVybDogJ2RhdGEvYnVkZ2V0Lmpzb24nLFxuICBpZDogJ2J1ZGdldCcsXG4gIGdyb3VwOiAnc2FtcGxlJ1xufSx7XG4gIG5hbWU6ICdDbGltYXRlIE5vcm1hbHMnLFxuICB1cmw6ICdkYXRhL2NsaW1hdGUuanNvbicsXG4gIGlkOiAnY2xpbWF0ZScsXG4gIGdyb3VwOiAnc2FtcGxlJ1xufSx7XG4gIG5hbWU6ICdDYW1wYWlnbnMnLFxuICB1cmw6ICdkYXRhL3dlYmFsbDI2Lmpzb24nLFxuICBpZDogJ3dlYmFsbDI2JyxcbiAgZ3JvdXA6ICdzYW1wbGUnXG59XSk7XG4iLCIndXNlIHN0cmljdCc7XG5cbi8qKlxuICogQG5nZG9jIGRpcmVjdGl2ZVxuICogQG5hbWUgdmx1aS5kaXJlY3RpdmU6ZmllbGRJbmZvXG4gKiBAZGVzY3JpcHRpb25cbiAqICMgZmllbGRJbmZvXG4gKi9cbmFuZ3VsYXIubW9kdWxlKCd2bHVpJylcbiAgLmRpcmVjdGl2ZSgnZmllbGRJbmZvJywgZnVuY3Rpb24gKERhdGFzZXQsIERyb3AsIHZsLCBjb25zdHMpIHtcbiAgICByZXR1cm4ge1xuICAgICAgdGVtcGxhdGVVcmw6ICdmaWVsZGluZm8vZmllbGRpbmZvLmh0bWwnLFxuICAgICAgcmVzdHJpY3Q6ICdFJyxcbiAgICAgIHJlcGxhY2U6IHRydWUsXG4gICAgICBzY29wZToge1xuICAgICAgICBmaWVsZDogJz0nLFxuICAgICAgICBzaG93VHlwZTogJz0nLFxuICAgICAgICBzaG93SW5mbzogJz0nLFxuICAgICAgICBzaG93Q2FyZXQ6ICc9JyxcbiAgICAgICAgcG9wdXBDb250ZW50OiAnPScsXG4gICAgICAgIHNob3dSZW1vdmU6ICc9JyxcbiAgICAgICAgcmVtb3ZlQWN0aW9uOiAnJicsXG4gICAgICAgIGFjdGlvbjogJyYnLFxuICAgICAgICBkaXNhYmxlQ291bnRDYXJldDogJz0nXG4gICAgICB9LFxuICAgICAgbGluazogZnVuY3Rpb24oc2NvcGUsIGVsZW1lbnQpIHtcbiAgICAgICAgdmFyIGZ1bmNzUG9wdXA7XG5cbiAgICAgICAgc2NvcGUudHlwZU5hbWVzID0gY29uc3RzLnR5cGVOYW1lcztcbiAgICAgICAgc2NvcGUuc3RhdHMgPSBEYXRhc2V0LnN0YXRzW3Njb3BlLmZpZWxkLm5hbWVdO1xuICAgICAgICBzY29wZS5pc1R5cGVzID0gdmwuZW5jRGVmLmlzVHlwZXM7XG5cbiAgICAgICAgc3dpdGNoKHNjb3BlLmZpZWxkLnR5cGUpe1xuICAgICAgICAgIGNhc2UgJ08nOlxuICAgICAgICAgICAgc2NvcGUuaWNvbiA9ICdmYS1mb250JztcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgIGNhc2UgJ04nOlxuICAgICAgICAgICAgc2NvcGUuaWNvbiA9ICdmYS1mb250JztcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgIGNhc2UgJ1EnOlxuICAgICAgICAgICAgc2NvcGUuaWNvbiA9ICdpY29uLWhhc2gnO1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgY2FzZSAnVCc6XG4gICAgICAgICAgICBzY29wZS5pY29uID0gJ2ZhLWNhbGVuZGFyJztcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICB9XG5cbiAgICAgICAgc2NvcGUuY2xpY2tlZCA9IGZ1bmN0aW9uKCRldmVudCl7XG4gICAgICAgICAgaWYoc2NvcGUuYWN0aW9uICYmICRldmVudC50YXJnZXQgIT09IGVsZW1lbnQuZmluZCgnLmZhLWNhcmV0LWRvd24nKVswXSAmJlxuICAgICAgICAgICAgJGV2ZW50LnRhcmdldCAhPT0gZWxlbWVudC5maW5kKCdzcGFuLnR5cGUnKVswXSkge1xuICAgICAgICAgICAgc2NvcGUuYWN0aW9uKCRldmVudCk7XG4gICAgICAgICAgfVxuICAgICAgICB9O1xuXG4gICAgICAgIHNjb3BlLmZ1bmMgPSBmdW5jdGlvbihmaWVsZCkge1xuICAgICAgICAgIHJldHVybiBmaWVsZC5hZ2dyZWdhdGUgfHwgZmllbGQudGltZVVuaXQgfHxcbiAgICAgICAgICAgIChmaWVsZC5iaW4gJiYgJ2JpbicpIHx8XG4gICAgICAgICAgICBmaWVsZC5fYWdncmVnYXRlIHx8IGZpZWxkLl90aW1lVW5pdCB8fFxuICAgICAgICAgICAgKGZpZWxkLl9iaW4gJiYgJ2JpbicpIHx8IChmaWVsZC5fYW55ICYmICdhdXRvJyk7XG4gICAgICAgIH07XG5cbiAgICAgICAgc2NvcGUuJHdhdGNoKCdwb3B1cENvbnRlbnQnLCBmdW5jdGlvbihwb3B1cENvbnRlbnQpIHtcbiAgICAgICAgICBpZiAoIXBvcHVwQ29udGVudCkgeyByZXR1cm47IH1cblxuICAgICAgICAgIGlmIChmdW5jc1BvcHVwKSB7XG4gICAgICAgICAgICBmdW5jc1BvcHVwLmRlc3Ryb3koKTtcbiAgICAgICAgICB9XG5cbiAgICAgICAgICBmdW5jc1BvcHVwID0gbmV3IERyb3Aoe1xuICAgICAgICAgICAgY29udGVudDogcG9wdXBDb250ZW50LFxuICAgICAgICAgICAgdGFyZ2V0OiBlbGVtZW50LmZpbmQoJy50eXBlLWNhcmV0JylbMF0sXG4gICAgICAgICAgICBwb3NpdGlvbjogJ2JvdHRvbSBsZWZ0JyxcbiAgICAgICAgICAgIG9wZW5PbjogJ2NsaWNrJ1xuICAgICAgICAgIH0pO1xuICAgICAgICB9KTtcblxuICAgICAgICBzY29wZS4kb24oJyRkZXN0cm95JywgZnVuY3Rpb24oKSB7XG4gICAgICAgICAgaWYgKGZ1bmNzUG9wdXApIHtcbiAgICAgICAgICAgIGZ1bmNzUG9wdXAuZGVzdHJveSgpO1xuICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICB9XG4gICAgfTtcbiAgfSk7XG4iLCIndXNlIHN0cmljdCc7XG5cbi8qKlxuICogQG5nZG9jIHNlcnZpY2VcbiAqIEBuYW1lIHZlZ2EtbGl0ZS11aS5sb2dnZXJcbiAqIEBkZXNjcmlwdGlvblxuICogIyBsb2dnZXJcbiAqIFNlcnZpY2UgaW4gdGhlIHZlZ2EtbGl0ZS11aS5cbiAqL1xuYW5ndWxhci5tb2R1bGUoJ3ZsdWknKVxuICAuc2VydmljZSgnTG9nZ2VyJywgZnVuY3Rpb24gKCRsb2NhdGlvbiwgJHdpbmRvdywgY29uc3RzLCBBbmFseXRpY3MpIHtcblxuICAgIHZhciBzZXJ2aWNlID0ge307XG5cbiAgICBzZXJ2aWNlLmxldmVscyA9IHtcbiAgICAgIE9GRjoge2lkOidPRkYnLCByYW5rOjB9LFxuICAgICAgVFJBQ0U6IHtpZDonVFJBQ0UnLCByYW5rOjF9LFxuICAgICAgREVCVUc6IHtpZDonREVCVUcnLCByYW5rOjJ9LFxuICAgICAgSU5GTzoge2lkOidJTkZPJywgcmFuazozfSxcbiAgICAgIFdBUk46IHtpZDonV0FSTicsIHJhbms6NH0sXG4gICAgICBFUlJPUjoge2lkOidFUlJPUicsIHJhbms6NX0sXG4gICAgICBGQVRBTDoge2lkOidGQVRBTCcsIHJhbms6Nn1cbiAgICB9O1xuXG4gICAgc2VydmljZS5hY3Rpb25zID0ge1xuICAgICAgLy8gREFUQVxuICAgICAgSU5JVElBTElaRToge2NhdGVnb3J5OiAnREFUQScsIGlkOiAnSU5JVElBTElaRScsIGxldmVsOiBzZXJ2aWNlLmxldmVscy5ERUJVR30sXG4gICAgICBVTkRPOiB7Y2F0ZWdvcnk6ICdEQVRBJywgaWQ6ICdVTkRPJywgbGV2ZWw6IHNlcnZpY2UubGV2ZWxzLklORk99LFxuICAgICAgUkVETzoge2NhdGVnb3J5OiAnREFUQScsIGlkOiAnUkVETycsIGxldmVsOiBzZXJ2aWNlLmxldmVscy5JTkZPfSxcbiAgICAgIERBVEFTRVRfQ0hBTkdFOiB7Y2F0ZWdvcnk6ICdEQVRBJywgaWQ6ICdEQVRBU0VUX0NIQU5HRScsIGxldmVsOiBzZXJ2aWNlLmxldmVscy5JTkZPfSxcbiAgICAgIERBVEFTRVRfT1BFTjoge2NhdGVnb3J5OiAnREFUQScsIGlkOiAnREFUQVNFVF9PUEVOJywgbGV2ZWw6IHNlcnZpY2UubGV2ZWxzLklORk99LFxuICAgICAgREFUQVNFVF9ORVdfUEFTVEU6IHtjYXRlZ29yeTogJ0RBVEEnLCBpZDogJ0RBVEFTRVRfTkVXX1BBU1RFJywgbGV2ZWw6IHNlcnZpY2UubGV2ZWxzLklORk99LFxuICAgICAgREFUQVNFVF9ORVdfVVJMOiB7Y2F0ZWdvcnk6ICdEQVRBJywgaWQ6ICdEQVRBU0VUX05FV19VUkwnLCBsZXZlbDogc2VydmljZS5sZXZlbHMuSU5GT30sXG4gICAgICAvLyBCT09LTUFSS1xuICAgICAgQk9PS01BUktfQUREOiB7Y2F0ZWdvcnk6ICdCT09LTUFSSycsIGlkOidCT09LTUFSS19BREQnLCBsZXZlbDogc2VydmljZS5sZXZlbHMuSU5GT30sXG4gICAgICBCT09LTUFSS19SRU1PVkU6IHtjYXRlZ29yeTogJ0JPT0tNQVJLJywgaWQ6J0JPT0tNQVJLX1JFTU9WRScsIGxldmVsOiBzZXJ2aWNlLmxldmVscy5JTkZPfSxcbiAgICAgIEJPT0tNQVJLX09QRU46IHtjYXRlZ29yeTogJ0JPT0tNQVJLJywgaWQ6J0JPT0tNQVJLX09QRU4nLCBsZXZlbDogc2VydmljZS5sZXZlbHMuSU5GT30sXG4gICAgICBCT09LTUFSS19DTE9TRToge2NhdGVnb3J5OiAnQk9PS01BUksnLCBpZDonQk9PS01BUktfQ0xPU0UnLCBsZXZlbDogc2VydmljZS5sZXZlbHMuSU5GT30sXG4gICAgICBCT09LTUFSS19DTEVBUjoge2NhdGVnb3J5OiAnQk9PS01BUksnLCBpZDogJ0JPT0tNQVJLX0NMRUFSJywgbGV2ZWw6IHNlcnZpY2UubGV2ZWxzLklORk99LFxuICAgICAgLy8gQ0hBUlRcbiAgICAgIENIQVJUX01PVVNFT1ZFUjoge2NhdGVnb3J5OiAnQ0hBUlQnLCBpZDonQ0hBUlRfTU9VU0VPVkVSJywgbGV2ZWw6IHNlcnZpY2UubGV2ZWxzLkRFQlVHfSxcbiAgICAgIENIQVJUX01PVVNFT1VUOiB7Y2F0ZWdvcnk6ICdDSEFSVCcsIGlkOidDSEFSVF9NT1VTRU9VVCcsIGxldmVsOiBzZXJ2aWNlLmxldmVscy5ERUJVR30sXG4gICAgICBDSEFSVF9SRU5ERVI6IHtjYXRlZ29yeTogJ0NIQVJUJywgaWQ6J0NIQVJUX1JFTkRFUicsIGxldmVsOiBzZXJ2aWNlLmxldmVscy5ERUJVR30sXG4gICAgICBDSEFSVF9FWFBPU0U6IHtjYXRlZ29yeTogJ0NIQVJUJywgaWQ6J0NIQVJUX0VYUE9TRScsIGxldmVsOiBzZXJ2aWNlLmxldmVscy5ERUJVR30sXG4gICAgICBDSEFSVF9UT09MVElQOiB7Y2F0ZWdvcnk6ICdDSEFSVCcsIGlkOidDSEFSVF9UT09MVElQJywgbGV2ZWw6IHNlcnZpY2UubGV2ZWxzLkRFQlVHfSxcbiAgICAgIENIQVJUX1RPT0xUSVBfRU5EOiB7Y2F0ZWdvcnk6ICdDSEFSVCcsIGlkOidDSEFSVF9UT09MVElQX0VORCcsIGxldmVsOiBzZXJ2aWNlLmxldmVscy5ERUJVR30sXG5cbiAgICAgIFNPUlRfVE9HR0xFOiB7Y2F0ZWdvcnk6ICdDSEFSVCcsIGlkOidTT1JUX1RPR0dMRScsIGxldmVsOiBzZXJ2aWNlLmxldmVscy5JTkZPfSxcbiAgICAgIE1BUktUWVBFX1RPR0dMRToge2NhdGVnb3J5OiAnQ0hBUlQnLCBpZDonTUFSS1RZUEVfVE9HR0xFJywgbGV2ZWw6IHNlcnZpY2UubGV2ZWxzLklORk99LFxuICAgICAgRFJJTExfRE9XTl9PUEVOOiB7Y2F0ZWdvcnk6ICdDSEFSVCcsIGlkOidEUklMTF9ET1dOX09QRU4nLCBsZXZlbDogc2VydmljZS5sZXZlbHMuSU5GT30sXG4gICAgICBEUklMTF9ET1dOX0NMT1NFOiB7Y2F0ZWdvcnk6ICdDSEFSVCcsIGlkOiAnRFJJTExfRE9XTl9DTE9TRScsIGxldmVsOiBzZXJ2aWNlLmxldmVscy5JTkZPfSxcbiAgICAgIExPR19UT0dHTEU6IHtjYXRlZ29yeTogJ0NIQVJUJywgaWQ6ICdMT0dfVE9HR0xFJywgbGV2ZWw6IHNlcnZpY2UubGV2ZWxzLklORk99LFxuICAgICAgVFJBTlNQT1NFX1RPR0dMRToge2NhdGVnb3J5OiAnQ0hBUlQnLCBpZDogJ1RSQU5TUE9TRV9UT0dHTEUnLCBsZXZlbDogc2VydmljZS5sZXZlbHMuSU5GT30sXG4gICAgICBOVUxMX0ZJTFRFUl9UT0dHTEU6IHtjYXRlZ29yeTogJ0NIQVJUJywgaWQ6J05VTExfRklMVEVSX1RPR0dMRScsIGxldmVsOiBzZXJ2aWNlLmxldmVscy5JTkZPfSxcblxuICAgICAgQ0xVU1RFUl9TRUxFQ1Q6IHtjYXRlZ29yeTogJ0NIQVJUJywgaWQ6J0NMVVNURVJfU0VMRUNUJywgbGV2ZWw6IHNlcnZpY2UubGV2ZWxzLklORk99LFxuICAgICAgTE9BRF9NT1JFOiB7Y2F0ZWdvcnk6ICdDSEFSVCcsIGlkOidMT0FEX01PUkUnLCBsZXZlbDogc2VydmljZS5sZXZlbHMuSU5GT30sXG5cbiAgICAgIC8vIEZJRUxEU1xuICAgICAgRklFTERTX0NIQU5HRToge2NhdGVnb3J5OiAnRklFTERTJywgaWQ6ICdGSUVMRFNfQ0hBTkdFJywgbGV2ZWw6IHNlcnZpY2UubGV2ZWxzLklORk99LFxuICAgICAgRklFTERTX1JFU0VUOiB7Y2F0ZWdvcnk6ICdGSUVMRFMnLCBpZDogJ0ZJRUxEU19SRVNFVCcsIGxldmVsOiBzZXJ2aWNlLmxldmVscy5JTkZPfSxcbiAgICAgIEZVTkNfQ0hBTkdFOiB7Y2F0ZWdvcnk6ICdGSUVMRFMnLCBpZDogJ0ZVTkNfQ0hBTkdFJywgbGV2ZWw6IHNlcnZpY2UubGV2ZWxzLklORk99LFxuXG4gICAgICAvL1BPTEVTVEFSXG4gICAgICBTUEVDX0NIQU5HRToge2NhdGVnb3J5OidQT0xFU1RBUicsIGlkOiAnU1BFQ19DSEFOR0UnLCBsZXZlbDogc2VydmljZS5sZXZlbHMuREVCVUd9LFxuICAgICAgRklFTERfRFJPUDoge2NhdGVnb3J5OiAnUE9MRVNUQVInLCBpZDogJ0ZJRUxEX0RST1AnLCBsZXZlbDogc2VydmljZS5sZXZlbHMuREVCVUd9LFxuICAgICAgTUFSS19DSEFOR0U6IHtjYXRlZ29yeTogJ1BPTEVTVEFSJywgaWQ6ICdNQVJLX0NIQU5HRScsIGxldmVsOiBzZXJ2aWNlLmxldmVscy5ERUJVR31cbiAgICB9O1xuXG4gICAgc2VydmljZS5sb2dJbnRlcmFjdGlvbiA9IGZ1bmN0aW9uKGFjdGlvbiwgbGFiZWwsIGRhdGEpIHtcbiAgICAgIGlmICghY29uc3RzLmxvZ2dpbmcpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuICAgICAgdmFyIHZhbHVlID0gZGF0YSA/IGRhdGEudmFsdWUgOiB1bmRlZmluZWQ7XG4gICAgICBpZihhY3Rpb24ubGV2ZWwucmFuayA+PSBzZXJ2aWNlLmxldmVscy5JTkZPLnJhbmspIHtcbiAgICAgICAgQW5hbHl0aWNzLnRyYWNrRXZlbnQoYWN0aW9uLmNhdGVnb3J5LCBhY3Rpb24uaWQsIGxhYmVsLCB2YWx1ZSk7XG4gICAgICAgIGNvbnNvbGUubG9nKCdbTG9nZ2luZ10gJywgYWN0aW9uLmlkLCBsYWJlbCwgZGF0YSk7XG4gICAgICB9XG4gICAgfTtcblxuICAgIHNlcnZpY2UubG9nSW50ZXJhY3Rpb24oc2VydmljZS5hY3Rpb25zLklOSVRJQUxJWkUsIGNvbnN0cy5hcHBJZCk7XG5cbiAgICByZXR1cm4gc2VydmljZTtcbiAgfSk7XG4iLCIndXNlIHN0cmljdCc7XG5cbi8qKlxuICogQG5nZG9jIGRpcmVjdGl2ZVxuICogQG5hbWUgdmx1aS5kaXJlY3RpdmU6bW9kYWxcbiAqIEBkZXNjcmlwdGlvblxuICogIyBtb2RhbFxuICovXG5hbmd1bGFyLm1vZHVsZSgndmx1aScpXG4gIC5kaXJlY3RpdmUoJ21vZGFsJywgZnVuY3Rpb24gKE1vZGFscykge1xuICAgIHJldHVybiB7XG4gICAgICB0ZW1wbGF0ZVVybDogJ21vZGFsL21vZGFsLmh0bWwnLFxuICAgICAgcmVzdHJpY3Q6ICdFJyxcbiAgICAgIHRyYW5zY2x1ZGU6IHRydWUsXG4gICAgICBzY29wZToge1xuICAgICAgICBhdXRvT3BlbjogJz0nLFxuICAgICAgICBtYXhXaWR0aDogJ0AnXG4gICAgICB9LFxuICAgICAgLy8gUHJvdmlkZSBhbiBpbnRlcmZhY2UgZm9yIGNoaWxkIGRpcmVjdGl2ZXMgdG8gY2xvc2UgdGhpcyBtb2RhbFxuICAgICAgY29udHJvbGxlcjogZnVuY3Rpb24oJHNjb3BlKSB7XG4gICAgICAgIHRoaXMuY2xvc2UgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgICAkc2NvcGUuaXNPcGVuID0gZmFsc2U7XG4gICAgICAgIH07XG4gICAgICB9LFxuICAgICAgbGluazogZnVuY3Rpb24oc2NvcGUsIGVsZW1lbnQsIGF0dHJzKSB7XG4gICAgICAgIHZhciBtb2RhbElkID0gYXR0cnMuaWQ7XG5cbiAgICAgICAgaWYgKHNjb3BlLm1heFdpZHRoKSB7XG4gICAgICAgICAgc2NvcGUud3JhcHBlclN0eWxlID0gJ21heC13aWR0aDonICsgc2NvcGUubWF4V2lkdGg7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBEZWZhdWx0IHRvIGNsb3NlZCB1bmxlc3MgYXV0b09wZW4gaXMgc2V0XG4gICAgICAgIHNjb3BlLmlzT3BlbiA9IHNjb3BlLmF1dG9PcGVuO1xuXG4gICAgICAgIC8vIFJlZ2lzdGVyIHRoaXMgbW9kYWwgd2l0aCB0aGUgc2VydmljZVxuICAgICAgICBNb2RhbHMucmVnaXN0ZXIobW9kYWxJZCwgc2NvcGUpO1xuICAgICAgICBzY29wZS4kb24oJyRkZXN0cm95JywgZnVuY3Rpb24oKSB7XG4gICAgICAgICAgTW9kYWxzLmRlcmVnaXN0ZXIobW9kYWxJZCk7XG4gICAgICAgIH0pO1xuICAgICAgfVxuICAgIH07XG4gIH0pO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG4vKipcbiAqIEBuZ2RvYyBkaXJlY3RpdmVcbiAqIEBuYW1lIHZsdWkuZGlyZWN0aXZlOm1vZGFsQ2xvc2VCdXR0b25cbiAqIEBkZXNjcmlwdGlvblxuICogIyBtb2RhbENsb3NlQnV0dG9uXG4gKi9cbmFuZ3VsYXIubW9kdWxlKCd2bHVpJylcbiAgLmRpcmVjdGl2ZSgnbW9kYWxDbG9zZUJ1dHRvbicsIGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiB7XG4gICAgICB0ZW1wbGF0ZVVybDogJ21vZGFsL21vZGFsY2xvc2VidXR0b24uaHRtbCcsXG4gICAgICByZXN0cmljdDogJ0UnLFxuICAgICAgcmVxdWlyZTogJ15ebW9kYWwnLFxuICAgICAgc2NvcGU6IHtcbiAgICAgICAgJ2Nsb3NlQ2FsbGJhY2snOiAnJm9uQ2xvc2UnXG4gICAgICB9LFxuICAgICAgbGluazogZnVuY3Rpb24oc2NvcGUsIGVsZW1lbnQsIGF0dHJzLCBtb2RhbENvbnRyb2xsZXIpIHtcbiAgICAgICAgc2NvcGUuY2xvc2VNb2RhbCA9IGZ1bmN0aW9uKCkge1xuICAgICAgICAgIG1vZGFsQ29udHJvbGxlci5jbG9zZSgpO1xuICAgICAgICAgIGlmIChzY29wZS5jbG9zZUNhbGxiYWNrKSB7XG4gICAgICAgICAgICBzY29wZS5jbG9zZUNhbGxiYWNrKCk7XG4gICAgICAgICAgfVxuICAgICAgICB9O1xuICAgICAgfVxuICAgIH07XG4gIH0pO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG4vKipcbiAqIEBuZ2RvYyBzZXJ2aWNlXG4gKiBAbmFtZSB2bHVpLk1vZGFsc1xuICogQGRlc2NyaXB0aW9uXG4gKiAjIE1vZGFsc1xuICogU2VydmljZSB1c2VkIHRvIGNvbnRyb2wgbW9kYWwgdmlzaWJpbGl0eSBmcm9tIGFueXdoZXJlIGluIHRoZSBhcHBsaWNhdGlvblxuICovXG5hbmd1bGFyLm1vZHVsZSgndmx1aScpXG4gIC5mYWN0b3J5KCdNb2RhbHMnLCBmdW5jdGlvbiAoJGNhY2hlRmFjdG9yeSkge1xuXG4gICAgLy8gVE9ETzogVGhlIHVzZSBvZiBzY29wZSBoZXJlIGFzIHRoZSBtZXRob2QgYnkgd2hpY2ggYSBtb2RhbCBkaXJlY3RpdmVcbiAgICAvLyBpcyByZWdpc3RlcmVkIGFuZCBjb250cm9sbGVkIG1heSBuZWVkIHRvIGNoYW5nZSB0byBzdXBwb3J0IHJldHJpZXZpbmdcbiAgICAvLyBkYXRhIGZyb20gYSBtb2RhbCBhcyBtYXkgYmUgbmVlZGVkIGluICM3N1xuICAgIHZhciBtb2RhbHNDYWNoZSA9ICRjYWNoZUZhY3RvcnkoJ21vZGFscycpO1xuXG4gICAgLy8gUHVibGljIEFQSVxuICAgIHJldHVybiB7XG4gICAgICByZWdpc3RlcjogZnVuY3Rpb24oaWQsIHNjb3BlKSB7XG4gICAgICAgIGlmIChtb2RhbHNDYWNoZS5nZXQoaWQpKSB7XG4gICAgICAgICAgY29uc29sZS5lcnJvcignQ2Fubm90IHJlZ2lzdGVyIHR3byBtb2RhbHMgd2l0aCBpZCAnICsgaWQpO1xuICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBtb2RhbHNDYWNoZS5wdXQoaWQsIHNjb3BlKTtcbiAgICAgIH0sXG5cbiAgICAgIGRlcmVnaXN0ZXI6IGZ1bmN0aW9uKGlkKSB7XG4gICAgICAgIG1vZGFsc0NhY2hlLnJlbW92ZShpZCk7XG4gICAgICB9LFxuXG4gICAgICAvLyBPcGVuIGEgbW9kYWxcbiAgICAgIG9wZW46IGZ1bmN0aW9uKGlkKSB7XG4gICAgICAgIHZhciBtb2RhbFNjb3BlID0gbW9kYWxzQ2FjaGUuZ2V0KGlkKTtcbiAgICAgICAgaWYgKCFtb2RhbFNjb3BlKSB7XG4gICAgICAgICAgY29uc29sZS5lcnJvcignVW5yZWdpc3RlcmVkIG1vZGFsIGlkICcgKyBpZCk7XG4gICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIG1vZGFsU2NvcGUuaXNPcGVuID0gdHJ1ZTtcbiAgICAgIH0sXG5cbiAgICAgIC8vIENsb3NlIGEgbW9kYWxcbiAgICAgIGNsb3NlOiBmdW5jdGlvbihpZCkge1xuICAgICAgICB2YXIgbW9kYWxTY29wZSA9IG1vZGFsc0NhY2hlLmdldChpZCk7XG4gICAgICAgIGlmICghbW9kYWxTY29wZSkge1xuICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ1VucmVnaXN0ZXJlZCBtb2RhbCBpZCAnICsgaWQpO1xuICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBtb2RhbFNjb3BlLmlzT3BlbiA9IGZhbHNlO1xuICAgICAgfSxcblxuICAgICAgZW1wdHk6IGZ1bmN0aW9uKCkge1xuICAgICAgICBtb2RhbHNDYWNoZS5yZW1vdmVBbGwoKTtcbiAgICAgIH0sXG5cbiAgICAgIGNvdW50OiBmdW5jdGlvbigpIHtcbiAgICAgICAgcmV0dXJuIG1vZGFsc0NhY2hlLmluZm8oKS5zaXplO1xuICAgICAgfVxuICAgIH07XG4gIH0pO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG4vKipcbiAqIEBuZ2RvYyBkaXJlY3RpdmVcbiAqIEBuYW1lIHZsdWkuZGlyZWN0aXZlOnRhYlxuICogQGRlc2NyaXB0aW9uXG4gKiAjIHRhYlxuICovXG5hbmd1bGFyLm1vZHVsZSgndmx1aScpXG4gIC5kaXJlY3RpdmUoJ3RhYicsIGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiB7XG4gICAgICB0ZW1wbGF0ZVVybDogJ3RhYnMvdGFiLmh0bWwnLFxuICAgICAgcmVzdHJpY3Q6ICdFJyxcbiAgICAgIHJlcXVpcmU6ICdeXnRhYnNldCcsXG4gICAgICByZXBsYWNlOiB0cnVlLFxuICAgICAgdHJhbnNjbHVkZTogdHJ1ZSxcbiAgICAgIHNjb3BlOiB7XG4gICAgICAgIGhlYWRpbmc6ICdAJ1xuICAgICAgfSxcbiAgICAgIGxpbms6IGZ1bmN0aW9uKHNjb3BlLCBlbGVtZW50LCBhdHRycywgdGFic2V0Q29udHJvbGxlcikge1xuICAgICAgICB0YWJzZXRDb250cm9sbGVyLmFkZFRhYihzY29wZSk7XG4gICAgICB9XG4gICAgfTtcbiAgfSk7XG4iLCIndXNlIHN0cmljdCc7XG5cbi8qKlxuICogQG5nZG9jIGRpcmVjdGl2ZVxuICogQG5hbWUgdmx1aS5kaXJlY3RpdmU6dGFic2V0XG4gKiBAZGVzY3JpcHRpb25cbiAqICMgdGFic2V0XG4gKi9cbmFuZ3VsYXIubW9kdWxlKCd2bHVpJylcbiAgLmRpcmVjdGl2ZSgndGFic2V0JywgZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIHtcbiAgICAgIHRlbXBsYXRlVXJsOiAndGFicy90YWJzZXQuaHRtbCcsXG4gICAgICByZXN0cmljdDogJ0UnLFxuICAgICAgdHJhbnNjbHVkZTogdHJ1ZSxcblxuICAgICAgLy8gSW50ZXJmYWNlIGZvciB0YWJzIHRvIHJlZ2lzdGVyIHRoZW1zZWx2ZXNcbiAgICAgIGNvbnRyb2xsZXI6IGZ1bmN0aW9uKCkge1xuICAgICAgICB2YXIgc2VsZiA9IHRoaXM7XG5cbiAgICAgICAgdGhpcy50YWJzID0gW107XG5cbiAgICAgICAgdGhpcy5hZGRUYWIgPSBmdW5jdGlvbih0YWJTY29wZSkge1xuICAgICAgICAgIC8vIEZpcnN0IHRhYiBpcyBhbHdheXMgYXV0by1hY3RpdmF0ZWQ7IG90aGVycyBhdXRvLWRlYWN0aXZhdGVkXG4gICAgICAgICAgdGFiU2NvcGUuYWN0aXZlID0gc2VsZi50YWJzLmxlbmd0aCA9PT0gMDtcbiAgICAgICAgICBzZWxmLnRhYnMucHVzaCh0YWJTY29wZSk7XG4gICAgICAgIH07XG5cbiAgICAgICAgdGhpcy5zaG93VGFiID0gZnVuY3Rpb24oc2VsZWN0ZWRUYWIpIHtcbiAgICAgICAgICBzZWxmLnRhYnMuZm9yRWFjaChmdW5jdGlvbih0YWIpIHtcbiAgICAgICAgICAgIC8vIEFjdGl2YXRlIHRoZSBzZWxlY3RlZCB0YWIsIGRlYWN0aXZhdGUgYWxsIG90aGVyc1xuICAgICAgICAgICAgdGFiLmFjdGl2ZSA9IHRhYiA9PT0gc2VsZWN0ZWRUYWI7XG4gICAgICAgICAgfSk7XG4gICAgICAgIH07XG4gICAgICB9LFxuXG4gICAgICAvLyBFeHBvc2UgY29udHJvbGxlciB0byB0ZW1wbGF0ZXMgYXMgXCJ0YWJzZXRcIlxuICAgICAgY29udHJvbGxlckFzOiAndGFic2V0J1xuICAgIH07XG4gIH0pO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG5hbmd1bGFyLm1vZHVsZSgndmx1aScpXG4gIC5kaXJlY3RpdmUoJ3ZsUGxvdCcsIGZ1bmN0aW9uKGRsLCB2bCwgdmcsICR0aW1lb3V0LCAkcSwgRGF0YXNldCwgQ29uZmlnLCBjb25zdHMsIF8sICRkb2N1bWVudCwgTG9nZ2VyLCBIZWFwLCAkd2luZG93KSB7XG4gICAgdmFyIGNvdW50ZXIgPSAwO1xuICAgIHZhciBNQVhfQ0FOVkFTX1NJWkUgPSAzMjc2Ny8yLCBNQVhfQ0FOVkFTX0FSRUEgPSAyNjg0MzU0NTYvNDtcblxuICAgIHZhciByZW5kZXJRdWV1ZSA9IG5ldyBIZWFwKGZ1bmN0aW9uKGEsIGIpe1xuICAgICAgICByZXR1cm4gYi5wcmlvcml0eSAtIGEucHJpb3JpdHk7XG4gICAgICB9KSxcbiAgICAgIHJlbmRlcmluZyA9IGZhbHNlO1xuXG4gICAgZnVuY3Rpb24gZ2V0UmVuZGVyZXIod2lkdGgsIGhlaWdodCkge1xuICAgICAgLy8gdXNlIGNhbnZhcyBieSBkZWZhdWx0IGJ1dCB1c2Ugc3ZnIGlmIHRoZSB2aXN1YWxpemF0aW9uIGlzIHRvbyBiaWdcbiAgICAgIGlmICh3aWR0aCA+IE1BWF9DQU5WQVNfU0laRSB8fCBoZWlnaHQgPiBNQVhfQ0FOVkFTX1NJWkUgfHwgd2lkdGgqaGVpZ2h0ID4gTUFYX0NBTlZBU19BUkVBKSB7XG4gICAgICAgIHJldHVybiAnc3ZnJztcbiAgICAgIH1cbiAgICAgIHJldHVybiAnY2FudmFzJztcbiAgICB9XG5cbiAgICByZXR1cm4ge1xuICAgICAgdGVtcGxhdGVVcmw6ICd2bHBsb3QvdmxwbG90Lmh0bWwnLFxuICAgICAgcmVzdHJpY3Q6ICdFJyxcbiAgICAgIHNjb3BlOiB7XG4gICAgICAgIGNoYXJ0OiAnPScsXG5cbiAgICAgICAgLy9vcHRpb25hbFxuICAgICAgICBkaXNhYmxlZDogJz0nLFxuICAgICAgICBpc0luTGlzdDogJz0nLFxuXG4gICAgICAgIGFsd2F5c1Njcm9sbGFibGU6ICc9JyxcbiAgICAgICAgY29uZmlnU2V0OiAnQCcsXG4gICAgICAgIG1heEhlaWdodDonPScsXG4gICAgICAgIG1heFdpZHRoOiAnPScsXG4gICAgICAgIG92ZXJmbG93OiAnPScsXG4gICAgICAgIHByaW9yaXR5OiAnPScsXG4gICAgICAgIHJlc2NhbGU6ICc9JyxcbiAgICAgICAgdGh1bWJuYWlsOiAnPScsXG4gICAgICAgIHRvb2x0aXA6ICc9JyxcbiAgICAgIH0sXG4gICAgICByZXBsYWNlOiB0cnVlLFxuICAgICAgbGluazogZnVuY3Rpb24oc2NvcGUsIGVsZW1lbnQpIHtcbiAgICAgICAgdmFyIEhPVkVSX1RJTUVPVVQgPSA1MDAsXG4gICAgICAgICAgVE9PTFRJUF9USU1FT1VUID0gMjUwO1xuXG4gICAgICAgIHNjb3BlLnZpc0lkID0gKGNvdW50ZXIrKyk7XG4gICAgICAgIHNjb3BlLmhvdmVyUHJvbWlzZSA9IG51bGw7XG4gICAgICAgIHNjb3BlLnRvb2x0aXBQcm9taXNlID0gbnVsbDtcbiAgICAgICAgc2NvcGUuaG92ZXJGb2N1cyA9IGZhbHNlO1xuICAgICAgICBzY29wZS50b29sdGlwQWN0aXZlID0gZmFsc2U7XG4gICAgICAgIHNjb3BlLmRlc3Ryb3llZCA9IGZhbHNlO1xuICAgICAgICB2YXIgZm9ybWF0ID0gdmwuZm9ybWF0KCcnKTtcblxuICAgICAgICBzY29wZS5tb3VzZW92ZXIgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgICBzY29wZS5ob3ZlclByb21pc2UgPSAkdGltZW91dChmdW5jdGlvbigpe1xuICAgICAgICAgICAgTG9nZ2VyLmxvZ0ludGVyYWN0aW9uKExvZ2dlci5hY3Rpb25zLkNIQVJUX01PVVNFT1ZFUiwgJycsIHNjb3BlLmNoYXJ0LnZsU3BlYyk7XG4gICAgICAgICAgICBzY29wZS5ob3ZlckZvY3VzID0gIXNjb3BlLnRodW1ibmFpbDtcbiAgICAgICAgICB9LCBIT1ZFUl9USU1FT1VUKTtcbiAgICAgICAgfTtcblxuICAgICAgICBzY29wZS5tb3VzZW91dCA9IGZ1bmN0aW9uKCkge1xuICAgICAgICAgIGlmIChzY29wZS5ob3ZlckZvY3VzKSB7XG4gICAgICAgICAgICBMb2dnZXIubG9nSW50ZXJhY3Rpb24oTG9nZ2VyLmFjdGlvbnMuQ0hBUlRfTU9VU0VPVVQsICcnLCBzY29wZS5jaGFydC52bFNwZWMpO1xuICAgICAgICAgIH1cblxuICAgICAgICAgICR0aW1lb3V0LmNhbmNlbChzY29wZS5ob3ZlclByb21pc2UpO1xuICAgICAgICAgIHNjb3BlLmhvdmVyRm9jdXMgPSBzY29wZS51bmxvY2tlZCA9IGZhbHNlO1xuICAgICAgICB9O1xuXG4gICAgICAgIGZ1bmN0aW9uIHZpZXdPbk1vdXNlT3ZlcihldmVudCwgaXRlbSkge1xuICAgICAgICAgIGlmICghaXRlbSB8fCAhaXRlbS5kYXR1bSkgeyByZXR1cm47IH1cblxuICAgICAgICAgIHNjb3BlLnRvb2x0aXBQcm9taXNlID0gJHRpbWVvdXQoZnVuY3Rpb24gYWN0aXZhdGVUb29sdGlwKCl7XG4gICAgICAgICAgICBzY29wZS50b29sdGlwQWN0aXZlID0gdHJ1ZTtcbiAgICAgICAgICAgIExvZ2dlci5sb2dJbnRlcmFjdGlvbihMb2dnZXIuYWN0aW9ucy5DSEFSVF9UT09MVElQLCBpdGVtLmRhdHVtKTtcblxuICAgICAgICAgICAgLy8gY29udmVydCBkYXRhIGludG8gYSBmb3JtYXQgdGhhdCB3ZSBjYW4gZWFzaWx5IHVzZSB3aXRoIG5nIHRhYmxlIGFuZCBuZy1yZXBlYXRcbiAgICAgICAgICAgIC8vIFRPRE86IHJldmlzZSBpZiB0aGlzIGlzIGFjdHVhbGx5IGEgZ29vZCBpZGVhXG4gICAgICAgICAgICBzY29wZS5kYXRhID0gXyhpdGVtLmRhdHVtKS5vbWl0KCdfcHJldicsICdfaWQnKSAvLyBvbWl0IHZlZ2EgaW50ZXJuYWxzXG4gICAgICAgICAgICAgIC5wYWlycygpLnZhbHVlKClcbiAgICAgICAgICAgICAgLm1hcChmdW5jdGlvbihwKSB7XG4gICAgICAgICAgICAgICAgcFsxXSA9IGRsLmlzTnVtYmVyKHBbMV0pID8gZm9ybWF0KHBbMV0pIDogcFsxXTtcbiAgICAgICAgICAgICAgICByZXR1cm4gcDtcbiAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICBzY29wZS4kZGlnZXN0KCk7XG5cbiAgICAgICAgICAgIHZhciB0b29sdGlwID0gZWxlbWVudC5maW5kKCcudmlzLXRvb2x0aXAnKSxcbiAgICAgICAgICAgICAgJGJvZHkgPSBhbmd1bGFyLmVsZW1lbnQoJGRvY3VtZW50KSxcbiAgICAgICAgICAgICAgd2lkdGggPSB0b29sdGlwLndpZHRoKCksXG4gICAgICAgICAgICAgIGhlaWdodD0gdG9vbHRpcC5oZWlnaHQoKTtcblxuICAgICAgICAgICAgLy8gcHV0IHRvb2x0aXAgYWJvdmUgaWYgaXQncyBuZWFyIHRoZSBzY3JlZW4ncyBib3R0b20gYm9yZGVyXG4gICAgICAgICAgICBpZiAoZXZlbnQucGFnZVkrMTAraGVpZ2h0IDwgJGJvZHkuaGVpZ2h0KCkpIHtcbiAgICAgICAgICAgICAgdG9vbHRpcC5jc3MoJ3RvcCcsIChldmVudC5wYWdlWSsxMCkpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgdG9vbHRpcC5jc3MoJ3RvcCcsIChldmVudC5wYWdlWS0xMC1oZWlnaHQpKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gcHV0IHRvb2x0aXAgb24gbGVmdCBpZiBpdCdzIG5lYXIgdGhlIHNjcmVlbidzIHJpZ2h0IGJvcmRlclxuICAgICAgICAgICAgaWYgKGV2ZW50LnBhZ2VYKzEwKyB3aWR0aCA8ICRib2R5LndpZHRoKCkpIHtcbiAgICAgICAgICAgICAgdG9vbHRpcC5jc3MoJ2xlZnQnLCAoZXZlbnQucGFnZVgrMTApKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgIHRvb2x0aXAuY3NzKCdsZWZ0JywgKGV2ZW50LnBhZ2VYLTEwLXdpZHRoKSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfSwgVE9PTFRJUF9USU1FT1VUKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGZ1bmN0aW9uIHZpZXdPbk1vdXNlT3V0KGV2ZW50LCBpdGVtKSB7XG4gICAgICAgICAgLy9jbGVhciBwb3NpdGlvbnNcbiAgICAgICAgICB2YXIgdG9vbHRpcCA9IGVsZW1lbnQuZmluZCgnLnZpcy10b29sdGlwJyk7XG4gICAgICAgICAgdG9vbHRpcC5jc3MoJ3RvcCcsIG51bGwpO1xuICAgICAgICAgIHRvb2x0aXAuY3NzKCdsZWZ0JywgbnVsbCk7XG4gICAgICAgICAgJHRpbWVvdXQuY2FuY2VsKHNjb3BlLnRvb2x0aXBQcm9taXNlKTtcbiAgICAgICAgICBpZiAoc2NvcGUudG9vbHRpcEFjdGl2ZSkge1xuICAgICAgICAgICAgTG9nZ2VyLmxvZ0ludGVyYWN0aW9uKExvZ2dlci5hY3Rpb25zLkNIQVJUX1RPT0xUSVBfRU5ELCBpdGVtLmRhdHVtKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgc2NvcGUudG9vbHRpcEFjdGl2ZSA9IGZhbHNlO1xuICAgICAgICAgIHNjb3BlLmRhdGEgPSBbXTtcbiAgICAgICAgICBzY29wZS4kZGlnZXN0KCk7XG4gICAgICAgIH1cblxuICAgICAgICBmdW5jdGlvbiBnZXRWZ1NwZWMoKSB7XG4gICAgICAgICAgdmFyIGNvbmZpZ1NldCA9IHNjb3BlLmNvbmZpZ1NldCB8fCBjb25zdHMuZGVmYXVsdENvbmZpZ1NldCB8fCB7fTtcblxuICAgICAgICAgIGlmICghc2NvcGUuY2hhcnQudmxTcGVjKSByZXR1cm47XG5cbiAgICAgICAgICB2YXIgdmxTcGVjID0gXy5jbG9uZURlZXAoc2NvcGUuY2hhcnQudmxTcGVjKTtcbiAgICAgICAgICB2bC5leHRlbmQodmxTcGVjLmNvbmZpZywgQ29uZmlnW2NvbmZpZ1NldF0oKSk7XG5cbiAgICAgICAgICAvLyB1c2UgY2hhcnQgc3RhdHMgaWYgYXZhaWxhYmxlIChmb3IgZXhhbXBsZSBmcm9tIGJvb2ttYXJrcylcbiAgICAgICAgICB2YXIgc3RhdHMgPSBzY29wZS5jaGFydC5zdGF0cyB8fCBEYXRhc2V0LnN0YXRzO1xuXG4gICAgICAgICAgcmV0dXJuIHZsLmNvbXBpbGUodmxTcGVjLCBzdGF0cyk7XG4gICAgICAgIH1cblxuICAgICAgICBmdW5jdGlvbiByZXNjYWxlSWZFbmFibGUoKSB7XG4gICAgICAgICAgaWYgKHNjb3BlLnJlc2NhbGUpIHtcbiAgICAgICAgICAgIHZhciB4UmF0aW8gPSBzY29wZS5tYXhXaWR0aCA+IDAgPyAgc2NvcGUubWF4V2lkdGggLyBzY29wZS53aWR0aCA6IDE7XG4gICAgICAgICAgICB2YXIgeVJhdGlvID0gc2NvcGUubWF4SGVpZ2h0ID4gMCA/IHNjb3BlLm1heEhlaWdodCAvIHNjb3BlLmhlaWdodCAgOiAxO1xuICAgICAgICAgICAgdmFyIHJhdGlvID0gTWF0aC5taW4oeFJhdGlvLCB5UmF0aW8pO1xuXG4gICAgICAgICAgICB2YXIgbmljZVJhdGlvID0gMTtcbiAgICAgICAgICAgIHdoaWxlICgwLjc1ICogbmljZVJhdGlvPiByYXRpbykge1xuICAgICAgICAgICAgICBuaWNlUmF0aW8gLz0gMjtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgdmFyIHQgPSBuaWNlUmF0aW8gKiAxMDAgLyAyICYmIDA7XG4gICAgICAgICAgICBlbGVtZW50LmZpbmQoJy52ZWdhJykuY3NzKCd0cmFuc2Zvcm0nLCAndHJhbnNsYXRlKC0nK3QrJyUsIC0nK3QrJyUpIHNjYWxlKCcrbmljZVJhdGlvKycpJyk7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGVsZW1lbnQuZmluZCgnLnZlZ2EnKS5jc3MoJ3RyYW5zZm9ybScsIG51bGwpO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIGZ1bmN0aW9uIGdldFNob3J0aGFuZCgpIHtcbiAgICAgICAgICByZXR1cm4gc2NvcGUuY2hhcnQuc2hvcnRoYW5kIHx8IChzY29wZS5jaGFydC52bFNwZWMgPyB2bC5FbmNvZGluZy5zaG9ydGhhbmQoc2NvcGUuY2hhcnQudmxTcGVjKSA6ICcnKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGZ1bmN0aW9uIHJlbmRlclF1ZXVlTmV4dCgpIHtcbiAgICAgICAgICAvLyByZW5kZXIgbmV4dCBpdGVtIGluIHRoZSBxdWV1ZVxuICAgICAgICAgIGlmIChyZW5kZXJRdWV1ZS5zaXplKCkgPiAwKSB7XG4gICAgICAgICAgICB2YXIgbmV4dCA9IHJlbmRlclF1ZXVlLnBvcCgpO1xuICAgICAgICAgICAgbmV4dC5wYXJzZSgpO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAvLyBvciBzYXkgdGhhdCBubyBvbmUgaXMgcmVuZGVyaW5nXG4gICAgICAgICAgICByZW5kZXJpbmcgPSBmYWxzZTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICBmdW5jdGlvbiByZW5kZXIoc3BlYykge1xuICAgICAgICAgIGlmICghc3BlYykge1xuICAgICAgICAgICAgaWYgKHZpZXcpIHtcbiAgICAgICAgICAgICAgdmlldy5vZmYoJ21vdXNlb3ZlcicpO1xuICAgICAgICAgICAgICB2aWV3Lm9mZignbW91c2VvdXQnKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICB9XG5cbiAgICAgICAgICBzY29wZS5oZWlnaHQgPSBzcGVjLmhlaWdodDtcbiAgICAgICAgICBpZiAoIWVsZW1lbnQpIHtcbiAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ2NhbiBub3QgZmluZCB2aXMgZWxlbWVudCcpO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIHZhciBzaG9ydGhhbmQgPSBnZXRTaG9ydGhhbmQoKTtcblxuICAgICAgICAgIHNjb3BlLnJlbmRlcmVyID0gZ2V0UmVuZGVyZXIoc3BlYyk7XG5cbiAgICAgICAgICBmdW5jdGlvbiBwYXJzZVZlZ2EoKSB7XG4gICAgICAgICAgICAvLyBpZiBubyBsb25nZXIgYSBwYXJ0IG9mIHRoZSBsaXN0LCBjYW5jZWwhXG4gICAgICAgICAgICBpZiAoc2NvcGUuZGVzdHJveWVkIHx8IHNjb3BlLmRpc2FibGVkIHx8IChzY29wZS5pc0luTGlzdCAmJiBzY29wZS5jaGFydC5maWVsZFNldEtleSAmJiAhc2NvcGUuaXNJbkxpc3Qoc2NvcGUuY2hhcnQuZmllbGRTZXRLZXkpKSkge1xuICAgICAgICAgICAgICBjb25zb2xlLmxvZygnY2FuY2VsIHJlbmRlcmluZycsIHNob3J0aGFuZCk7XG4gICAgICAgICAgICAgIHJlbmRlclF1ZXVlTmV4dCgpO1xuICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHZhciBzdGFydCA9IG5ldyBEYXRlKCkuZ2V0VGltZSgpO1xuICAgICAgICAgICAgLy8gcmVuZGVyIGlmIHN0aWxsIGEgcGFydCBvZiB0aGUgbGlzdFxuICAgICAgICAgICAgdmcucGFyc2Uuc3BlYyhzcGVjLCBmdW5jdGlvbihjaGFydCkge1xuICAgICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgIHZhciBlbmRQYXJzZSA9IG5ldyBEYXRlKCkuZ2V0VGltZSgpO1xuICAgICAgICAgICAgICAgIHZpZXcgPSBudWxsO1xuICAgICAgICAgICAgICAgIHZpZXcgPSBjaGFydCh7ZWw6IGVsZW1lbnRbMF19KTtcblxuICAgICAgICAgICAgICAgIGlmICghY29uc3RzLnVzZVVybCkge1xuICAgICAgICAgICAgICAgICAgdmlldy5kYXRhKHtyYXc6IERhdGFzZXQuZGF0YX0pO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIHNjb3BlLndpZHRoID0gIHZpZXcud2lkdGgoKTtcbiAgICAgICAgICAgICAgICBzY29wZS5oZWlnaHQgPSB2aWV3LmhlaWdodCgpO1xuICAgICAgICAgICAgICAgIHZpZXcucmVuZGVyZXIoZ2V0UmVuZGVyZXIoc3BlYy53aWR0aCwgc2NvcGUuaGVpZ2h0KSk7XG4gICAgICAgICAgICAgICAgdmlldy51cGRhdGUoKTtcblxuICAgICAgICAgICAgICAgIGlmIChjb25zdHMuZGVidWcpIHtcbiAgICAgICAgICAgICAgICAgICR3aW5kb3cudmlld3MgPSAkd2luZG93LnZpZXdzIHx8IHt9O1xuICAgICAgICAgICAgICAgICAgJHdpbmRvdy52aWV3c1tzaG9ydGhhbmRdID0gdmlldztcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICBMb2dnZXIubG9nSW50ZXJhY3Rpb24oTG9nZ2VyLmFjdGlvbnMuQ0hBUlRfUkVOREVSLCAnJywgc2NvcGUuY2hhcnQudmxTcGVjKTtcbiAgICAgICAgICAgICAgICAgIHJlc2NhbGVJZkVuYWJsZSgpO1xuXG4gICAgICAgICAgICAgICAgdmFyIGVuZENoYXJ0ID0gbmV3IERhdGUoKS5nZXRUaW1lKCk7XG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coJ3BhcnNlIHNwZWMnLCAoZW5kUGFyc2Utc3RhcnQpLCAnY2hhcnRpbmcnLCAoZW5kQ2hhcnQtZW5kUGFyc2UpLCBzaG9ydGhhbmQpO1xuICAgICAgICAgICAgICAgIGlmIChzY29wZS50b29sdGlwKSB7XG4gICAgICAgICAgICAgICAgICB2aWV3Lm9uKCdtb3VzZW92ZXInLCB2aWV3T25Nb3VzZU92ZXIpO1xuICAgICAgICAgICAgICAgICAgdmlldy5vbignbW91c2VvdXQnLCB2aWV3T25Nb3VzZU91dCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgICAgICAgICAgY29uc29sZS5lcnJvcihlKTtcbiAgICAgICAgICAgICAgfSBmaW5hbGx5IHtcbiAgICAgICAgICAgICAgICByZW5kZXJRdWV1ZU5leHQoKTtcbiAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICB9XG5cbiAgICAgICAgICBpZiAoIXJlbmRlcmluZykgeyAvLyBpZiBubyBpbnN0YW5jZSBpcyBiZWluZyByZW5kZXIgLS0gcmVuZGVyaW5nIG5vd1xuICAgICAgICAgICAgcmVuZGVyaW5nPXRydWU7XG4gICAgICAgICAgICBwYXJzZVZlZ2EoKTtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgLy8gb3RoZXJ3aXNlIHF1ZXVlIGl0XG4gICAgICAgICAgICByZW5kZXJRdWV1ZS5wdXNoKHtcbiAgICAgICAgICAgICAgcHJpb3JpdHk6IHNjb3BlLnByaW9yaXR5IHx8IDAsXG4gICAgICAgICAgICAgIHBhcnNlOiBwYXJzZVZlZ2FcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIHZhciB2aWV3O1xuICAgICAgICBzY29wZS4kd2F0Y2goZnVuY3Rpb24oKSB7XG4gICAgICAgICAgLy8gT21pdCBkYXRhIHByb3BlcnR5IHRvIHNwZWVkIHVwIGRlZXAgd2F0Y2hcbiAgICAgICAgICByZXR1cm4gXy5vbWl0KHNjb3BlLmNoYXJ0LnZsU3BlYywgJ2RhdGEnKTtcbiAgICAgICAgfSwgZnVuY3Rpb24oKSB7XG4gICAgICAgICAgdmFyIHNwZWMgPSBzY29wZS5jaGFydC52Z1NwZWMgPSBnZXRWZ1NwZWMoKTtcbiAgICAgICAgICBpZiAoIXNjb3BlLmNoYXJ0LmNsZWFuU3BlYykge1xuICAgICAgICAgICAgc2NvcGUuY2hhcnQuY2xlYW5TcGVjID0gdmwuRW5jb2RpbmcuZnJvbVNwZWMoc2NvcGUuY2hhcnQudmxTcGVjKS50b1NwZWModHJ1ZSk7XG4gICAgICAgICAgfVxuICAgICAgICAgIHJlbmRlcihzcGVjKTtcbiAgICAgICAgfSwgdHJ1ZSk7XG5cbiAgICAgICAgc2NvcGUuJG9uKCckZGVzdHJveScsIGZ1bmN0aW9uKCkge1xuICAgICAgICAgIGNvbnNvbGUubG9nKCd2bHBsb3QgZGVzdHJveWVkJyk7XG4gICAgICAgICAgaWYgKHZpZXcpIHtcbiAgICAgICAgICAgIHZpZXcub2ZmKCdtb3VzZW92ZXInKTtcbiAgICAgICAgICAgIHZpZXcub2ZmKCdtb3VzZW91dCcpO1xuICAgICAgICAgICAgdmlldyA9IG51bGw7XG4gICAgICAgICAgfVxuICAgICAgICAgIHZhciBzaG9ydGhhbmQgPSBnZXRTaG9ydGhhbmQoKTtcbiAgICAgICAgICBpZiAoY29uc3RzLmRlYnVnICYmICR3aW5kb3cudmlld3MpIHtcbiAgICAgICAgICAgIGRlbGV0ZSAkd2luZG93LnZpZXdzW3Nob3J0aGFuZF07XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgc2NvcGUuZGVzdHJveWVkID0gdHJ1ZTtcbiAgICAgICAgICAvLyBGSVhNRSBhbm90aGVyIHdheSB0aGF0IHNob3VsZCBlbGltaW5hdGUgdGhpbmdzIGZyb20gbWVtb3J5IGZhc3RlciBzaG91bGQgYmUgcmVtb3ZpbmdcbiAgICAgICAgICAvLyBtYXliZSBzb21ldGhpbmcgbGlrZVxuICAgICAgICAgIC8vIHJlbmRlclF1ZXVlLnNwbGljZShyZW5kZXJRdWV1ZS5pbmRleE9mKHBhcnNlVmVnYSksIDEpKTtcbiAgICAgICAgICAvLyBidXQgd2l0aG91dCBwcm9wZXIgdGVzdGluZywgdGhpcyBpcyByaXNraWVyIHRoYW4gc2V0dGluZyBzY29wZS5kZXN0cm95ZWQuXG4gICAgICAgIH0pO1xuICAgICAgfVxuICAgIH07XG4gIH0pO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG4vKipcbiAqIEBuZ2RvYyBkaXJlY3RpdmVcbiAqIEBuYW1lIHZlZ2EtbGl0ZS11aS5kaXJlY3RpdmU6dmlzTGlzdEl0ZW1cbiAqIEBkZXNjcmlwdGlvblxuICogIyB2aXNMaXN0SXRlbVxuICovXG5hbmd1bGFyLm1vZHVsZSgndmx1aScpXG4gIC5kaXJlY3RpdmUoJ3ZsUGxvdEdyb3VwJywgZnVuY3Rpb24gKEJvb2ttYXJrcywgY29uc3RzLCBkbCwgdmwsIERhdGFzZXQsIExvZ2dlciwgXykge1xuICAgIHJldHVybiB7XG4gICAgICB0ZW1wbGF0ZVVybDogJ3ZscGxvdGdyb3VwL3ZscGxvdGdyb3VwLmh0bWwnLFxuICAgICAgcmVzdHJpY3Q6ICdFJyxcbiAgICAgIHJlcGxhY2U6IHRydWUsXG4gICAgICBjb250cm9sbGVyOiBmdW5jdGlvbigkc2NvcGUsICRlbGVtZW50KSB7XG4gICAgICAgIHRoaXMuZ2V0RHJvcFRhcmdldCA9IGZ1bmN0aW9uKCkge1xuICAgICAgICAgIHJldHVybiAkZWxlbWVudC5maW5kKCcuZmEtd3JlbmNoJylbMF07XG4gICAgICAgIH07XG4gICAgICB9LFxuICAgICAgc2NvcGU6IHtcbiAgICAgICAgLyogcGFzcyB0byB2bHBsb3QgKiovXG4gICAgICAgIGNoYXJ0OiAnPScsXG5cbiAgICAgICAgLy9vcHRpb25hbFxuICAgICAgICBkaXNhYmxlZDogJz0nLFxuICAgICAgICBpc0luTGlzdDogJz0nLFxuXG4gICAgICAgIGFsd2F5c1Njcm9sbGFibGU6ICc9JyxcbiAgICAgICAgY29uZmlnU2V0OiAnQCcsXG4gICAgICAgIG1heEhlaWdodDogJz0nLFxuICAgICAgICBtYXhXaWR0aDogJz0nLFxuICAgICAgICBvdmVyZmxvdzogJz0nLFxuICAgICAgICBwcmlvcml0eTogJz0nLFxuICAgICAgICByZXNjYWxlOiAnPScsXG4gICAgICAgIHRodW1ibmFpbDogJz0nLFxuICAgICAgICB0b29sdGlwOiAnPScsXG5cbiAgICAgICAgLyogdmxwbG90Z3JvdXAgc3BlY2lmaWMgKi9cblxuICAgICAgICBmaWVsZFNldDogJz0nLFxuXG4gICAgICAgIHNob3dCb29rbWFyazogJ0AnLFxuICAgICAgICBzaG93RGVidWc6ICc9JyxcbiAgICAgICAgc2hvd0V4cGFuZDogJz0nLFxuICAgICAgICBzaG93RmlsdGVyTnVsbDogJ0AnLFxuICAgICAgICBzaG93TGFiZWw6ICdAJyxcbiAgICAgICAgc2hvd0xvZzogJ0AnLFxuICAgICAgICBzaG93TWFya1R5cGU6ICdAJyxcbiAgICAgICAgc2hvd1NvcnQ6ICdAJyxcbiAgICAgICAgc2hvd1RyYW5zcG9zZTogJ0AnLFxuXG4gICAgICAgIGFsd2F5c1NlbGVjdGVkOiAnPScsXG4gICAgICAgIGlzU2VsZWN0ZWQ6ICc9JyxcbiAgICAgICAgaGlnaGxpZ2h0ZWQ6ICc9JyxcbiAgICAgICAgZXhwYW5kQWN0aW9uOiAnJicsXG4gICAgICB9LFxuICAgICAgbGluazogZnVuY3Rpb24gcG9zdExpbmsoc2NvcGUpIHtcbiAgICAgICAgc2NvcGUuQm9va21hcmtzID0gQm9va21hcmtzO1xuICAgICAgICBzY29wZS5jb25zdHMgPSBjb25zdHM7XG4gICAgICAgIHNjb3BlLkRhdGFzZXQgPSBEYXRhc2V0O1xuXG4gICAgICAgIC8vIERlZmVyIHJlbmRlcmluZyB0aGUgZGVidWcgRHJvcCBwb3B1cCB1bnRpbCBpdCBpcyByZXF1ZXN0ZWRcbiAgICAgICAgc2NvcGUucmVuZGVyUG9wdXAgPSBmYWxzZTtcbiAgICAgICAgLy8gVXNlIF8ub25jZSBiZWNhdXNlIHRoZSBwb3B1cCBvbmx5IG5lZWRzIHRvIGJlIGluaXRpYWxpemVkIG9uY2VcbiAgICAgICAgc2NvcGUuaW5pdGlhbGl6ZVBvcHVwID0gXy5vbmNlKGZ1bmN0aW9uKCkge1xuICAgICAgICAgIHNjb3BlLnJlbmRlclBvcHVwID0gdHJ1ZTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgc2NvcGUubG9nQ29kZSA9IGZ1bmN0aW9uKG5hbWUsIHZhbHVlKSB7XG4gICAgICAgICAgY29uc29sZS5sb2cobmFtZSsnOlxcblxcbicsIEpTT04uc3RyaW5naWZ5KHZhbHVlKSk7XG4gICAgICAgIH07XG5cbiAgICAgICAgLy8gVE9HR0xFIExPR1xuXG4gICAgICAgIHNjb3BlLmxvZyA9IHt9O1xuICAgICAgICBzY29wZS5sb2cuc3VwcG9ydCA9IGZ1bmN0aW9uKHNwZWMsIGVuY1R5cGUpIHtcbiAgICAgICAgICBpZiAoIXNwZWMpIHsgcmV0dXJuIGZhbHNlOyB9XG4gICAgICAgICAgdmFyIGVuY29kaW5nID0gc3BlYy5lbmNvZGluZyxcbiAgICAgICAgICAgIGZpZWxkID0gZW5jb2RpbmdbZW5jVHlwZV07XG5cbiAgICAgICAgICByZXR1cm4gZmllbGQgJiYgZmllbGQudHlwZSA9PT0nUScgJiYgIWZpZWxkLmJpbjtcbiAgICAgICAgfTtcblxuICAgICAgICBzY29wZS5sb2cudG9nZ2xlID0gZnVuY3Rpb24oc3BlYywgZW5jVHlwZSkge1xuICAgICAgICAgIGlmICghc2NvcGUubG9nLnN1cHBvcnQoc3BlYywgZW5jVHlwZSkpIHsgcmV0dXJuOyB9XG5cbiAgICAgICAgICB2YXIgZmllbGQgPSBzcGVjLmVuY29kaW5nW2VuY1R5cGVdLFxuICAgICAgICAgICAgc2NhbGUgPSBmaWVsZC5zY2FsZSA9IGZpZWxkLnNjYWxlIHx8IHt9O1xuXG4gICAgICAgICAgc2NhbGUudHlwZSA9IHNjYWxlLnR5cGUgPT09ICdsb2cnID8gJ2xpbmVhcicgOiAnbG9nJztcbiAgICAgICAgICBMb2dnZXIubG9nSW50ZXJhY3Rpb24oTG9nZ2VyLmFjdGlvbnMuTE9HX1RPR0dMRSwgc2NvcGUuY2hhcnQuc2hvcnRoYW5kKTtcbiAgICAgICAgfTtcbiAgICAgICAgc2NvcGUubG9nLmFjdGl2ZSA9IGZ1bmN0aW9uKHNwZWMsIGVuY1R5cGUpIHtcbiAgICAgICAgICBpZiAoIXNjb3BlLmxvZy5zdXBwb3J0KHNwZWMsIGVuY1R5cGUpKSB7IHJldHVybjsgfVxuXG4gICAgICAgICAgdmFyIGZpZWxkID0gc3BlYy5lbmNvZGluZ1tlbmNUeXBlXSxcbiAgICAgICAgICAgIHNjYWxlID0gZmllbGQuc2NhbGUgPSBmaWVsZC5zY2FsZSB8fCB7fTtcblxuICAgICAgICAgIHJldHVybiBzY2FsZS50eXBlID09PSAnbG9nJztcbiAgICAgICAgfTtcblxuICAgICAgICAvLyBUT0dHTEUgRklMVEVSXG4gICAgICAgIC8vIFRPRE86IGV4dHJhY3QgdG9nZ2xlRmlsdGVyTnVsbCB0byBiZSBpdHMgb3duIGNsYXNzXG5cbiAgICAgICAgc2NvcGUudG9nZ2xlRmlsdGVyTnVsbCA9IGZ1bmN0aW9uKHNwZWMpIHtcbiAgICAgICAgICBMb2dnZXIubG9nSW50ZXJhY3Rpb24oTG9nZ2VyLmFjdGlvbnMuTlVMTF9GSUxURVJfVE9HR0xFLCBzY29wZS5jaGFydC5zaG9ydGhhbmQpO1xuXG4gICAgICAgICAgc3BlYy5jb25maWcgPSBzcGVjLmNvbmZpZyB8fCB7fTtcbiAgICAgICAgICBzcGVjLmNvbmZpZy5maWx0ZXJOdWxsID0gc3BlYy5jb25maWcuZmlsdGVyTnVsbCB8fCB7XG4gICAgICAgICAgICAvLyBUT0RPOiBpbml0aWF0ZSB0aGlzIGZyb20gZmlsdGVyTnVsbCdzIHNjaGVtYSBpbnN0ZWFkXG4gICAgICAgICAgICBOOiBmYWxzZSxcbiAgICAgICAgICAgIE86IGZhbHNlLFxuICAgICAgICAgICAgVDogdHJ1ZSxcbiAgICAgICAgICAgIFE6IHRydWVcbiAgICAgICAgICB9O1xuICAgICAgICAgIHNwZWMuY29uZmlnLmZpbHRlck51bGwuTyA9ICFzcGVjLmNvbmZpZy5maWx0ZXJOdWxsLk87XG4gICAgICAgICAgc3BlYy5jb25maWcuZmlsdGVyTnVsbC5OID0gIXNwZWMuY29uZmlnLmZpbHRlck51bGwuTjtcbiAgICAgICAgfTtcblxuICAgICAgICBzY29wZS50b2dnbGVGaWx0ZXJOdWxsLnN1cHBvcnQgPSBmdW5jdGlvbihzcGVjLCBzdGF0cykge1xuICAgICAgICAgIHZhciBmaWVsZHMgPSB2bC5lbmMuZmllbGRzKHNwZWMuZW5jb2RpbmcpO1xuICAgICAgICAgIGZvciAodmFyIGZpZWxkTmFtZSBpbiBmaWVsZHMpIHtcbiAgICAgICAgICAgIHZhciBmaWVsZExpc3QgPSBmaWVsZHNbZmllbGROYW1lXTtcbiAgICAgICAgICAgIGlmIChcbiAgICAgICAgICAgICAgICAoZmllbGRMaXN0LmNvbnRhaW5zVHlwZS5PIHx8IGZpZWxkTGlzdC5jb250YWluc1R5cGUuTikgJiZcbiAgICAgICAgICAgICAgICAoZmllbGROYW1lIGluIHN0YXRzKSAmJlxuICAgICAgICAgICAgICAgIHN0YXRzW2ZpZWxkTmFtZV0ubWlzc2luZyA+IDBcbiAgICAgICAgICAgICAgKSB7XG4gICAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH07XG5cbiAgICAgICAgLy8gVE9HR0xFIFNPUlRcbiAgICAgICAgLy8gVE9ETzogZXh0cmFjdCB0b2dnbGVTb3J0IHRvIGJlIGl0cyBvd24gY2xhc3NcblxuICAgICAgICB2YXIgdG9nZ2xlU29ydCA9IHNjb3BlLnRvZ2dsZVNvcnQgPSB7fTtcblxuICAgICAgICB0b2dnbGVTb3J0Lm1vZGVzID0gWydvcmRpbmFsLWFzY2VuZGluZycsICdvcmRpbmFsLWRlc2NlbmRpbmcnLFxuICAgICAgICAgICdxdWFudGl0YXRpdmUtYXNjZW5kaW5nJywgJ3F1YW50aXRhdGl2ZS1kZXNjZW5kaW5nJywgJ2N1c3RvbSddO1xuXG4gICAgICAgIHRvZ2dsZVNvcnQudG9nZ2xlID0gZnVuY3Rpb24oc3BlYykge1xuICAgICAgICAgIExvZ2dlci5sb2dJbnRlcmFjdGlvbihMb2dnZXIuYWN0aW9ucy5TT1JUX1RPR0dMRSwgc2NvcGUuY2hhcnQuc2hvcnRoYW5kKTtcbiAgICAgICAgICB2YXIgY3VycmVudE1vZGUgPSB0b2dnbGVTb3J0Lm1vZGUoc3BlYyk7XG4gICAgICAgICAgdmFyIGN1cnJlbnRNb2RlSW5kZXggPSB0b2dnbGVTb3J0Lm1vZGVzLmluZGV4T2YoY3VycmVudE1vZGUpO1xuXG4gICAgICAgICAgdmFyIG5ld01vZGVJbmRleCA9IChjdXJyZW50TW9kZUluZGV4ICsgMSkgJSAodG9nZ2xlU29ydC5tb2Rlcy5sZW5ndGggLSAxKTtcbiAgICAgICAgICB2YXIgbmV3TW9kZSA9IHRvZ2dsZVNvcnQubW9kZXNbbmV3TW9kZUluZGV4XTtcblxuICAgICAgICAgIGNvbnNvbGUubG9nKCd0b2dnbGVTb3J0JywgY3VycmVudE1vZGUsIG5ld01vZGUpO1xuXG4gICAgICAgICAgdmFyIGNoYW5uZWxzID0gdG9nZ2xlU29ydC5jaGFubmVscyhzcGVjKTtcbiAgICAgICAgICBzcGVjLmVuY29kaW5nW2NoYW5uZWxzLm9yZGluYWxdLnNvcnQgPSB0b2dnbGVTb3J0LmdldFNvcnQobmV3TW9kZSwgc3BlYyk7XG4gICAgICAgIH07XG5cbiAgICAgICAgLyoqIEdldCBzb3J0IHByb3BlcnR5IGRlZmluaXRpb24gdGhhdCBtYXRjaGVzIGVhY2ggbW9kZS4gKi9cbiAgICAgICAgdG9nZ2xlU29ydC5nZXRTb3J0ID0gZnVuY3Rpb24obW9kZSwgc3BlYykge1xuICAgICAgICAgIGlmIChtb2RlID09PSAnb3JkaW5hbC1hc2NlbmRpbmcnKSB7XG4gICAgICAgICAgICByZXR1cm4gJ2FzY2VuZGluZyc7XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgaWYgKG1vZGUgPT09ICdvcmRpbmFsLWRlc2NlbmRpbmcnKSB7XG4gICAgICAgICAgICByZXR1cm4gJ2Rlc2NlbmRpbmcnO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIHZhciBjaGFubmVscyA9IHRvZ2dsZVNvcnQuY2hhbm5lbHMoc3BlYyk7XG4gICAgICAgICAgdmFyIHFFbmNEZWYgPSBzcGVjLmVuY29kaW5nW2NoYW5uZWxzLnF1YW50aXRhdGl2ZV07XG5cbiAgICAgICAgICBpZiAobW9kZSA9PT0gJ3F1YW50aXRhdGl2ZS1hc2NlbmRpbmcnKSB7XG4gICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICBvcDogcUVuY0RlZi5hZ2dyZWdhdGUsXG4gICAgICAgICAgICAgIGZpZWxkOiBxRW5jRGVmLm5hbWUsXG4gICAgICAgICAgICAgIG9yZGVyOiAnYXNjZW5kaW5nJ1xuICAgICAgICAgICAgfTtcbiAgICAgICAgICB9XG5cbiAgICAgICAgICBpZiAobW9kZSA9PT0gJ3F1YW50aXRhdGl2ZS1kZXNjZW5kaW5nJykge1xuICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgb3A6IHFFbmNEZWYuYWdncmVnYXRlLFxuICAgICAgICAgICAgICBmaWVsZDogcUVuY0RlZi5uYW1lLFxuICAgICAgICAgICAgICBvcmRlcjogJ2Rlc2NlbmRpbmcnXG4gICAgICAgICAgICB9O1xuICAgICAgICAgIH1cblxuICAgICAgICAgIHJldHVybiBudWxsO1xuICAgICAgICB9O1xuXG4gICAgICAgIHRvZ2dsZVNvcnQubW9kZSA9IGZ1bmN0aW9uKHNwZWMpIHtcbiAgICAgICAgICB2YXIgY2hhbm5lbHMgPSB0b2dnbGVTb3J0LmNoYW5uZWxzKHNwZWMpO1xuICAgICAgICAgIHZhciBzb3J0ID0gc3BlYy5lbmNvZGluZ1tjaGFubmVscy5vcmRpbmFsXS5zb3J0O1xuXG4gICAgICAgICAgaWYgKHNvcnQgPT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgcmV0dXJuICdvcmRpbmFsLWFzY2VuZGluZyc7XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCB0b2dnbGVTb3J0Lm1vZGVzLmxlbmd0aCAtIDEgOyBpKyspIHtcbiAgICAgICAgICAgIC8vIGNoZWNrIGlmIHNvcnQgbWF0Y2hlcyBhbnkgb2YgdGhlIHNvcnQgZm9yIGVhY2ggbW9kZSBleGNlcHQgJ2N1c3RvbScuXG4gICAgICAgICAgICB2YXIgbW9kZSA9IHRvZ2dsZVNvcnQubW9kZXNbaV07XG4gICAgICAgICAgICB2YXIgc29ydE9mTW9kZSA9IHRvZ2dsZVNvcnQuZ2V0U29ydChtb2RlLCBzcGVjKTtcblxuICAgICAgICAgICAgaWYgKF8uaXNFcXVhbChzb3J0LCBzb3J0T2ZNb2RlKSkge1xuICAgICAgICAgICAgICByZXR1cm4gbW9kZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG5cbiAgICAgICAgICBpZiAoZGwuaXNPYmplY3Qoc29ydCkgJiYgc29ydC5vcCAmJiBzb3J0LmZpZWxkKSB7XG4gICAgICAgICAgICByZXR1cm4gJ2N1c3RvbSc7XG4gICAgICAgICAgfVxuICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ2ludmFsaWQgbW9kZScpO1xuICAgICAgICAgIHJldHVybiBudWxsO1xuICAgICAgICB9O1xuXG4gICAgICAgIHRvZ2dsZVNvcnQuY2hhbm5lbHMgPSBmdW5jdGlvbihzcGVjKSB7XG4gICAgICAgICAgcmV0dXJuIHNwZWMuZW5jb2RpbmcueC50eXBlID09PSAnTicgfHwgc3BlYy5lbmNvZGluZy54LnR5cGUgPT09ICdPJyA/XG4gICAgICAgICAgICAgICAgICB7b3JkaW5hbDogJ3gnLCBxdWFudGl0YXRpdmU6ICd5J30gOlxuICAgICAgICAgICAgICAgICAge29yZGluYWw6ICd5JywgcXVhbnRpdGF0aXZlOiAneCd9O1xuICAgICAgICB9O1xuXG4gICAgICAgIHRvZ2dsZVNvcnQuc3VwcG9ydCA9IGZ1bmN0aW9uKHNwZWMsIHN0YXRzKSB7XG4gICAgICAgICAgdmFyIGVuYyA9IHNwZWMuZW5jb2Rpbmc7XG5cbiAgICAgICAgICBpZiAodmwuZW5jLmhhcyhlbmMsICdyb3cnKSB8fCB2bC5lbmMuaGFzKGVuYywgJ2NvbCcpIHx8XG4gICAgICAgICAgICAhdmwuZW5jLmhhcyhlbmMsICd4JykgfHwgIXZsLmVuYy5oYXMoZW5jLCAneScpIHx8XG4gICAgICAgICAgICAhdmwuRW5jb2RpbmcuYWx3YXlzTm9PY2NsdXNpb24oc3BlYywgc3RhdHMpKSB7XG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgcmV0dXJuICggdmwuZW5jRGVmLmlzVHlwZXMoZW5jLngsIFsnTicsICdPJ10pICYmIHZsLmVuY0RlZi5pc01lYXN1cmUoZW5jLnkpKSA/ICd4JyA6XG4gICAgICAgICAgICAoIHZsLmVuY0RlZi5pc1R5cGVzKGVuYy55LCBbJ04nLCdPJ10pICYmIHZsLmVuY0RlZi5pc01lYXN1cmUoZW5jLngpKSA/ICd5JyA6IGZhbHNlO1xuICAgICAgICB9O1xuXG4gICAgICAgIHNjb3BlLnRvZ2dsZVNvcnRDbGFzcyA9IGZ1bmN0aW9uKHZsU3BlYykge1xuICAgICAgICAgIGlmICghdmxTcGVjIHx8ICF0b2dnbGVTb3J0LnN1cHBvcnQodmxTcGVjLCBEYXRhc2V0LnN0YXRzKSkge1xuICAgICAgICAgICAgcmV0dXJuICdpbnZpc2libGUnO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIHZhciBvcmRpbmFsQ2hhbm5lbCA9IHZsU3BlYyAmJiB0b2dnbGVTb3J0LmNoYW5uZWxzKHZsU3BlYykub3JkaW5hbCxcbiAgICAgICAgICAgIG1vZGUgPSB2bFNwZWMgJiYgdG9nZ2xlU29ydC5tb2RlKHZsU3BlYyk7XG5cbiAgICAgICAgICB2YXIgZGlyZWN0aW9uQ2xhc3MgPSBvcmRpbmFsQ2hhbm5lbCA9PT0gJ3gnID8gJ3NvcnQteCAnIDogJyc7XG5cbiAgICAgICAgICBzd2l0Y2ggKG1vZGUpIHtcbiAgICAgICAgICAgIGNhc2UgJ29yZGluYWwtYXNjZW5kaW5nJzpcbiAgICAgICAgICAgICAgcmV0dXJuIGRpcmVjdGlvbkNsYXNzICsgJ2ZhLXNvcnQtYWxwaGEtYXNjJztcbiAgICAgICAgICAgIGNhc2UgJ29yZGluYWwtZGVzY2VuZGluZyc6XG4gICAgICAgICAgICAgIHJldHVybiBkaXJlY3Rpb25DbGFzcyArICdmYS1zb3J0LWFscGhhLWRlc2MnO1xuICAgICAgICAgICAgY2FzZSAncXVhbnRpdGF0aXZlLWFzY2VuZGluZyc6XG4gICAgICAgICAgICAgIHJldHVybiBkaXJlY3Rpb25DbGFzcyArICdmYS1zb3J0LWFtb3VudC1hc2MnO1xuICAgICAgICAgICAgY2FzZSAncXVhbnRpdGF0aXZlLWRlc2NlbmRpbmcnOlxuICAgICAgICAgICAgICByZXR1cm4gZGlyZWN0aW9uQ2xhc3MgKyAnZmEtc29ydC1hbW91bnQtZGVzYyc7XG4gICAgICAgICAgICBkZWZhdWx0OiAvLyBjdXN0b21cbiAgICAgICAgICAgICAgcmV0dXJuIGRpcmVjdGlvbkNsYXNzICsgJ2ZhLXNvcnQnO1xuICAgICAgICAgIH1cbiAgICAgICAgfTtcblxuICAgICAgICBzY29wZS50cmFuc3Bvc2UgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgICBMb2dnZXIubG9nSW50ZXJhY3Rpb24oTG9nZ2VyLmFjdGlvbnMuVFJBTlNQT1NFX1RPR0dMRSwgc2NvcGUuY2hhcnQuc2hvcnRoYW5kKTtcbiAgICAgICAgICB2bC5FbmNvZGluZy50cmFuc3Bvc2Uoc2NvcGUuY2hhcnQudmxTcGVjKTtcbiAgICAgICAgfTtcblxuICAgICAgICBzY29wZS4kb24oJyRkZXN0cm95JywgZnVuY3Rpb24oKSB7XG4gICAgICAgICAgc2NvcGUuY2hhcnQgPSBudWxsO1xuICAgICAgICB9KTtcbiAgICAgIH1cbiAgICB9O1xuICB9KTtcbiIsIid1c2Ugc3RyaWN0JztcblxuLyoqXG4gKiBAbmdkb2MgZGlyZWN0aXZlXG4gKiBAbmFtZSB2ZWdhLWxpdGUtdWkuZGlyZWN0aXZlOnZpc0xpc3RJdGVtXG4gKiBAZGVzY3JpcHRpb25cbiAqICMgdmlzTGlzdEl0ZW1cbiAqL1xuYW5ndWxhci5tb2R1bGUoJ3ZsdWknKVxuICAuZGlyZWN0aXZlKCd2bFBsb3RHcm91cFBvcHVwJywgZnVuY3Rpb24gKERyb3ApIHtcbiAgICByZXR1cm4ge1xuICAgICAgdGVtcGxhdGVVcmw6ICd2bHBsb3Rncm91cC92bHBsb3Rncm91cHBvcHVwLmh0bWwnLFxuICAgICAgcmVzdHJpY3Q6ICdFJyxcbiAgICAgIHJlcXVpcmU6ICdeXnZsUGxvdEdyb3VwJyxcbiAgICAgIHNjb3BlOiBmYWxzZSxcbiAgICAgIGxpbms6IGZ1bmN0aW9uIHBvc3RMaW5rKHNjb3BlLCBlbGVtZW50LCBhdHRycywgdmxQbG90R3JvdXBDb250cm9sbGVyKSB7XG4gICAgICAgIHZhciBkZWJ1Z1BvcHVwID0gbmV3IERyb3Aoe1xuICAgICAgICAgIGNvbnRlbnQ6IGVsZW1lbnQuZmluZCgnLmRldi10b29sJylbMF0sXG4gICAgICAgICAgdGFyZ2V0OiB2bFBsb3RHcm91cENvbnRyb2xsZXIuZ2V0RHJvcFRhcmdldCgpLFxuICAgICAgICAgIHBvc2l0aW9uOiAnYm90dG9tIHJpZ2h0JyxcbiAgICAgICAgICBvcGVuT246ICdjbGljaycsXG4gICAgICAgICAgY29uc3RyYWluVG9XaW5kb3c6IHRydWVcbiAgICAgICAgfSk7XG5cbiAgICAgICAgc2NvcGUuJG9uKCckZGVzdHJveScsIGZ1bmN0aW9uKCkge1xuICAgICAgICAgIGRlYnVnUG9wdXAuZGVzdHJveSgpO1xuICAgICAgICB9KTtcbiAgICAgIH1cbiAgICB9O1xuICB9KTtcbiIsIid1c2Ugc3RyaWN0JztcblxuYW5ndWxhci5tb2R1bGUoJ3ZsdWknKVxuICAuZmlsdGVyKCdjb21wYWN0SlNPTicsIGZ1bmN0aW9uKEpTT04zKSB7XG4gICAgcmV0dXJuIGZ1bmN0aW9uKGlucHV0KSB7XG4gICAgICByZXR1cm4gSlNPTjMuc3RyaW5naWZ5KGlucHV0LCBudWxsLCAnICAnLCA4MCk7XG4gICAgfTtcbiAgfSk7XG4iLCIndXNlIHN0cmljdCc7XG5cbi8qKlxuICogQG5nZG9jIGZpbHRlclxuICogQG5hbWUgZmFjZXRlZHZpei5maWx0ZXI6cmVwb3J0VXJsXG4gKiBAZnVuY3Rpb25cbiAqIEBkZXNjcmlwdGlvblxuICogIyByZXBvcnRVcmxcbiAqIEZpbHRlciBpbiB0aGUgZmFjZXRlZHZpei5cbiAqL1xuYW5ndWxhci5tb2R1bGUoJ3ZsdWknKVxuICAuZmlsdGVyKCdyZXBvcnRVcmwnLCBmdW5jdGlvbiAoY29tcGFjdEpTT05GaWx0ZXIsIF8sIGNvbnN0cykge1xuICAgIGZ1bmN0aW9uIHZveWFnZXJSZXBvcnQocGFyYW1zKSB7XG4gICAgICB2YXIgdXJsID0gJ2h0dHBzOi8vZG9jcy5nb29nbGUuY29tL2Zvcm1zL2QvMVQ5WkExNEYzbW16ckhSN0pKVlVLeVBYenJNcUY1NENqTElPanYyRTdaRU0vdmlld2Zvcm0/JztcblxuICAgICAgaWYgKHBhcmFtcy5maWVsZHMpIHtcbiAgICAgICAgdmFyIHF1ZXJ5ID0gZW5jb2RlVVJJKGNvbXBhY3RKU09ORmlsdGVyKF8udmFsdWVzKHBhcmFtcy5maWVsZHMpKSk7XG4gICAgICAgIHVybCArPSAnZW50cnkuMTI0NTE5OTQ3Nz0nICsgcXVlcnkgKyAnJic7XG4gICAgICB9XG5cbiAgICAgIGlmIChwYXJhbXMuZW5jb2RpbmcpIHtcbiAgICAgICAgdmFyIGVuY29kaW5nID0gXy5vbWl0KHBhcmFtcy5lbmNvZGluZywgJ2NvbmZpZycpO1xuICAgICAgICBlbmNvZGluZyA9IGVuY29kZVVSSShjb21wYWN0SlNPTkZpbHRlcihlbmNvZGluZykpO1xuICAgICAgICB1cmwgKz0gJ2VudHJ5LjEzMjM2ODAxMzY9JyArIGVuY29kaW5nICsgJyYnO1xuICAgICAgfVxuXG4gICAgICBpZiAocGFyYW1zLmVuY29kaW5nMikge1xuICAgICAgICB2YXIgZW5jb2RpbmcyID0gXy5vbWl0KHBhcmFtcy5lbmNvZGluZzIsICdjb25maWcnKTtcbiAgICAgICAgZW5jb2RpbmcyID0gZW5jb2RlVVJJKGNvbXBhY3RKU09ORmlsdGVyKGVuY29kaW5nMikpO1xuICAgICAgICB1cmwgKz0gJ2VudHJ5Ljg1MzEzNzc4Nj0nICsgZW5jb2RpbmcyICsgJyYnO1xuICAgICAgfVxuXG4gICAgICB2YXIgdHlwZVByb3AgPSAnZW50cnkuMTk0MDI5MjY3Nz0nO1xuICAgICAgc3dpdGNoIChwYXJhbXMudHlwZSkge1xuICAgICAgICBjYXNlICd2bCc6XG4gICAgICAgICAgdXJsICs9IHR5cGVQcm9wICsgJ1Zpc3VhbGl6YXRpb24rUmVuZGVyaW5nKyhWZWdhbGl0ZSkmJztcbiAgICAgICAgICBicmVhaztcbiAgICAgICAgY2FzZSAndnInOlxuICAgICAgICAgIHVybCArPSB0eXBlUHJvcCArICdSZWNvbW1lbmRlcitBbGdvcml0aG0rKFZpc3JlYykmJztcbiAgICAgICAgICBicmVhaztcbiAgICAgICAgY2FzZSAnZnYnOlxuICAgICAgICAgIHVybCArPSB0eXBlUHJvcCArICdSZWNvbW1lbmRlcitVSSsoRmFjZXRlZFZpeikmJztcbiAgICAgICAgICBicmVhaztcblxuICAgICAgfVxuICAgICAgcmV0dXJuIHVybDtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiB2bHVpUmVwb3J0KHBhcmFtcykge1xuICAgICAgdmFyIHVybCA9ICdodHRwczovL2RvY3MuZ29vZ2xlLmNvbS9mb3Jtcy9kLzF4S3MtcUdhTFpFVWZiVG1oZG1Tb1MxM09LT0VwdXVfTk5XRTVUQUFtbF9ZL3ZpZXdmb3JtPyc7XG4gICAgICBpZiAocGFyYW1zLmVuY29kaW5nKSB7XG4gICAgICAgIHZhciBlbmNvZGluZyA9IF8ub21pdChwYXJhbXMuZW5jb2RpbmcsICdjb25maWcnKTtcbiAgICAgICAgZW5jb2RpbmcgPSBlbmNvZGVVUkkoY29tcGFjdEpTT05GaWx0ZXIoZW5jb2RpbmcpKTtcbiAgICAgICAgdXJsICs9ICdlbnRyeS4xMjQ1MTk5NDc3PScgKyBlbmNvZGluZyArICcmJztcbiAgICAgIH1cbiAgICAgIHJldHVybiB1cmw7XG4gICAgfVxuXG4gICAgcmV0dXJuIGNvbnN0cy5hcHBJZCA9PT0gJ3ZveWFnZXInID8gdm95YWdlclJlcG9ydCA6IHZsdWlSZXBvcnQ7XG4gIH0pOyIsIid1c2Ugc3RyaWN0JztcblxuLyoqXG4gKiBAbmdkb2MgZmlsdGVyXG4gKiBAbmFtZSB2ZWdhLWxpdGUtdWkuZmlsdGVyOmVuY29kZVVyaVxuICogQGZ1bmN0aW9uXG4gKiBAZGVzY3JpcHRpb25cbiAqICMgZW5jb2RlVXJpXG4gKiBGaWx0ZXIgaW4gdGhlIHZlZ2EtbGl0ZS11aS5cbiAqL1xuYW5ndWxhci5tb2R1bGUoJ3ZsdWknKVxuICAuZmlsdGVyKCdlbmNvZGVVUkknLCBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIGZ1bmN0aW9uIChpbnB1dCkge1xuICAgICAgcmV0dXJuIHdpbmRvdy5lbmNvZGVVUkkoaW5wdXQpO1xuICAgIH07XG4gIH0pOyIsIid1c2Ugc3RyaWN0JztcblxuYW5ndWxhci5tb2R1bGUoJ3ZsdWknKVxuICAuZmlsdGVyKCdzY2FsZVR5cGUnLCBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gZnVuY3Rpb24oaW5wdXQpIHtcbiAgICAgIHZhciBzY2FsZVR5cGVzID0ge1xuICAgICAgICBROiAnUXVhbnRpdGF0aXZlJyxcbiAgICAgICAgTjogJ05vbWluYWwnLFxuICAgICAgICBPOiAnT3JkaW5hbCcsXG4gICAgICAgIFQ6ICdUaW1lJ1xuICAgICAgfTtcblxuICAgICAgcmV0dXJuIHNjYWxlVHlwZXNbaW5wdXRdO1xuICAgIH07XG4gIH0pO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG4vKipcbiAqIEBuZ2RvYyBmaWx0ZXJcbiAqIEBuYW1lIHZlZ2EtbGl0ZS11aS5maWx0ZXI6dW5kZXJzY29yZTJzcGFjZVxuICogQGZ1bmN0aW9uXG4gKiBAZGVzY3JpcHRpb25cbiAqICMgdW5kZXJzY29yZTJzcGFjZVxuICogRmlsdGVyIGluIHRoZSB2ZWdhLWxpdGUtdWkuXG4gKi9cbmFuZ3VsYXIubW9kdWxlKCd2bHVpJylcbiAgLmZpbHRlcigndW5kZXJzY29yZTJzcGFjZScsIGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gZnVuY3Rpb24gKGlucHV0KSB7XG4gICAgICByZXR1cm4gaW5wdXQgPyBpbnB1dC5yZXBsYWNlKC9fKy9nLCAnICcpIDogJyc7XG4gICAgfTtcbiAgfSk7Il0sInNvdXJjZVJvb3QiOiIvc291cmNlLyJ9